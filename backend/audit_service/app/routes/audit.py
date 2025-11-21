from flask import request, jsonify, g
from datetime import datetime
from ..extensions import db, limiter
from ..models import AuditLog
from ..security.rbac import require_permission
from . import audit_bp


@audit_bp.post("/log")
@limiter.limit("500 per hour")
def create_audit_log():
    """
    Other services call this endpoint to log audit events.
    No authentication required for service-to-service logging.
    In production, use service mesh or API keys for inter-service auth.
    """
    data = request.get_json() or {}
    
    # Required fields
    service = data.get("service")
    action = data.get("action")
    status = data.get("status")
    
    if not all([service, action, status]):
        return {"msg": "service, action, and status are required"}, 400
    
    if status not in ["success", "failure", "error"]:
        return {"msg": "Invalid status. Must be: success, failure, or error"}, 400
    
    # Create audit log entry
    log = AuditLog(
        user_id=data.get("user_id"),
        user_email=data.get("user_email"),
        user_role=data.get("user_role"),
        service=service,
        action=action,
        resource_type=data.get("resource_type"),
        resource_id=data.get("resource_id"),
        status=status,
        details=data.get("details"),
        ip_address=data.get("ip_address"),
        user_agent=data.get("user_agent"),
    )
    
    db.session.add(log)
    db.session.commit()
    
    return {"msg": "Audit log created", "id": log.id}, 201


@audit_bp.get("/logs")
@require_permission("audit:view")
def list_audit_logs():
    """Auditors and admins can view all audit logs."""
    # Query parameters for filtering
    service = request.args.get("service")
    action = request.args.get("action")
    user_id = request.args.get("user_id")
    status = request.args.get("status")
    resource_type = request.args.get("resource_type")
    resource_id = request.args.get("resource_id")
    start_date = request.args.get("start_date")  # ISO format
    end_date = request.args.get("end_date")  # ISO format
    limit = request.args.get("limit", 100, type=int)
    offset = request.args.get("offset", 0, type=int)
    
    # Build query
    query = AuditLog.query
    
    if service:
        query = query.filter_by(service=service)
    if action:
        query = query.filter_by(action=action)
    if user_id:
        query = query.filter_by(user_id=user_id)
    if status:
        query = query.filter_by(status=status)
    if resource_type:
        query = query.filter_by(resource_type=resource_type)
    if resource_id:
        query = query.filter_by(resource_id=resource_id)
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(AuditLog.timestamp >= start_dt)
        except ValueError:
            return {"msg": "Invalid start_date format. Use ISO format."}, 400
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(AuditLog.timestamp <= end_dt)
        except ValueError:
            return {"msg": "Invalid end_date format. Use ISO format."}, 400
    
    # Get total count before pagination
    total = query.count()
    
    # Apply pagination and ordering
    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset).all()
    
    return jsonify({
        "total": total,
        "limit": limit,
        "offset": offset,
        "logs": [log.to_dict() for log in logs]
    })


@audit_bp.get("/logs/<int:log_id>")
@require_permission("audit:view")
def get_audit_log(log_id):
    """Get a specific audit log entry."""
    log = AuditLog.query.get(log_id)
    if not log:
        return {"msg": "Audit log not found"}, 404
    
    return log.to_dict(), 200


@audit_bp.get("/logs/user/<int:user_id>")
@require_permission("audit:view")
def get_user_audit_trail(user_id):
    """Get all audit logs for a specific user."""
    limit = request.args.get("limit", 100, type=int)
    offset = request.args.get("offset", 0, type=int)
    
    query = AuditLog.query.filter_by(user_id=user_id)
    total = query.count()
    
    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset).all()
    
    return jsonify({
        "user_id": user_id,
        "total": total,
        "limit": limit,
        "offset": offset,
        "logs": [log.to_dict() for log in logs]
    })


@audit_bp.get("/stats")
@require_permission("audit:view")
def get_audit_statistics():
    """Get audit log statistics."""
    # Count by service
    service_stats = db.session.query(
        AuditLog.service,
        db.func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.service).all()
    
    # Count by status
    status_stats = db.session.query(
        AuditLog.status,
        db.func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.status).all()
    
    # Count by action
    action_stats = db.session.query(
        AuditLog.action,
        db.func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.action).order_by(db.desc('count')).limit(10).all()
    
    return jsonify({
        "total_logs": AuditLog.query.count(),
        "by_service": {service: count for service, count in service_stats},
        "by_status": {status: count for status, count in status_stats},
        "top_actions": {action: count for action, count in action_stats}
    })
