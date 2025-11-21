from flask import request, jsonify, g
from datetime import datetime
from ..extensions import db, limiter
from ..models import SecurityEvent
from ..security.rbac import require_permission
from . import security_bp


@security_bp.post("/event")
@limiter.limit("500 per hour")
def create_security_event():
    """
    Other services call this endpoint to log security events.
    No authentication required for service-to-service logging.
    """
    data = request.get_json() or {}
    
    # Required fields
    event_type = data.get("event_type")
    severity = data.get("severity")
    description = data.get("description")
    
    if not all([event_type, severity, description]):
        return {"msg": "event_type, severity, and description are required"}, 400
    
    if severity not in ["low", "medium", "high", "critical"]:
        return {"msg": "Invalid severity. Must be: low, medium, high, or critical"}, 400
    
    # Create security event
    event = SecurityEvent(
        event_type=event_type,
        severity=severity,
        user_id=data.get("user_id"),
        user_email=data.get("user_email"),
        description=description,
        details=data.get("details"),
        ip_address=data.get("ip_address"),
        user_agent=data.get("user_agent"),
    )
    
    db.session.add(event)
    db.session.commit()
    
    return {"msg": "Security event created", "id": event.id}, 201


@security_bp.get("/events")
@require_permission("audit:view")
def list_security_events():
    """Auditors and admins can view security events."""
    # Query parameters
    event_type = request.args.get("event_type")
    severity = request.args.get("severity")
    user_id = request.args.get("user_id")
    investigated = request.args.get("investigated")  # true/false
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    limit = request.args.get("limit", 100, type=int)
    offset = request.args.get("offset", 0, type=int)
    
    # Build query
    query = SecurityEvent.query
    
    if event_type:
        query = query.filter_by(event_type=event_type)
    if severity:
        query = query.filter_by(severity=severity)
    if user_id:
        query = query.filter_by(user_id=user_id)
    if investigated is not None:
        is_investigated = investigated.lower() == 'true'
        query = query.filter_by(investigated=is_investigated)
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(SecurityEvent.timestamp >= start_dt)
        except ValueError:
            return {"msg": "Invalid start_date format. Use ISO format."}, 400
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(SecurityEvent.timestamp <= end_dt)
        except ValueError:
            return {"msg": "Invalid end_date format. Use ISO format."}, 400
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    events = query.order_by(SecurityEvent.timestamp.desc()).limit(limit).offset(offset).all()
    
    return jsonify({
        "total": total,
        "limit": limit,
        "offset": offset,
        "events": [event.to_dict() for event in events]
    })


@security_bp.get("/events/<int:event_id>")
@require_permission("audit:view")
def get_security_event(event_id):
    """Get a specific security event."""
    event = SecurityEvent.query.get(event_id)
    if not event:
        return {"msg": "Security event not found"}, 404
    
    return event.to_dict(), 200


@security_bp.put("/events/<int:event_id>/investigate")
@require_permission("audit:investigate")
def mark_event_investigated(event_id):
    """Mark a security event as investigated."""
    event = SecurityEvent.query.get(event_id)
    if not event:
        return {"msg": "Security event not found"}, 404
    
    if event.investigated:
        return {"msg": "Event already investigated"}, 400
    
    data = request.get_json() or {}
    resolution_notes = data.get("resolution_notes")
    
    if not resolution_notes:
        return {"msg": "resolution_notes is required"}, 400
    
    event.investigated = True
    event.investigated_by = g.user["user_id"]
    event.investigated_at = datetime.utcnow()
    event.resolution_notes = resolution_notes
    
    db.session.commit()
    
    return event.to_dict(), 200


@security_bp.get("/events/alerts")
@require_permission("audit:view")
def get_security_alerts():
    """Get uninvestigated high/critical security events."""
    events = SecurityEvent.query.filter(
        SecurityEvent.investigated == False,
        SecurityEvent.severity.in_(['high', 'critical'])
    ).order_by(SecurityEvent.timestamp.desc()).limit(50).all()
    
    return jsonify({
        "count": len(events),
        "alerts": [event.to_dict() for event in events]
    })


@security_bp.get("/stats")
@require_permission("audit:view")
def get_security_statistics():
    """Get security event statistics."""
    # Count by severity
    severity_stats = db.session.query(
        SecurityEvent.severity,
        db.func.count(SecurityEvent.id).label('count')
    ).group_by(SecurityEvent.severity).all()
    
    # Count by event type
    type_stats = db.session.query(
        SecurityEvent.event_type,
        db.func.count(SecurityEvent.id).label('count')
    ).group_by(SecurityEvent.event_type).order_by(db.desc('count')).limit(10).all()
    
    # Uninvestigated count
    uninvestigated = SecurityEvent.query.filter_by(investigated=False).count()
    
    return jsonify({
        "total_events": SecurityEvent.query.count(),
        "uninvestigated": uninvestigated,
        "by_severity": {severity: count for severity, count in severity_stats},
        "top_event_types": {event_type: count for event_type, count in type_stats}
    })
