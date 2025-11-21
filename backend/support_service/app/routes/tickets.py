from flask import request, jsonify, g
from datetime import datetime
from ..extensions import db, limiter
from ..models import Ticket, TicketNote
from ..security.rbac import require_permission
from . import tickets_bp


@tickets_bp.post("/")
@require_permission("tickets:create:own")
@limiter.limit("20 per hour")
def create_ticket():
    """Customer creates a new support ticket."""
    data = request.get_json() or {}
    subject = data.get("subject")
    description = data.get("description")
    priority = data.get("priority", "Medium")

    if not subject or not description:
        return {"msg": "subject and description are required"}, 400

    if priority not in ["Low", "Medium", "High", "Urgent"]:
        return {"msg": "Invalid priority. Must be: Low, Medium, High, or Urgent"}, 400

    ticket = Ticket(
        user_id=g.user["user_id"],
        subject=subject,
        description=description,
        priority=priority,
    )

    db.session.add(ticket)
    db.session.commit()

    return ticket.to_dict(), 201


@tickets_bp.get("/")
@require_permission("tickets:view:own")
def list_my_tickets():
    """Customer views their own tickets."""
    user_id = g.user["user_id"]
    
    # Optional filters
    status = request.args.get("status")
    
    query = Ticket.query.filter_by(user_id=user_id)
    
    if status:
        if status not in ["Open", "In Progress", "Resolved", "Closed"]:
            return {"msg": "Invalid status"}, 400
        query = query.filter_by(status=status)
    
    tickets = query.order_by(Ticket.created_at.desc()).all()
    
    return jsonify([t.to_dict() for t in tickets])


@tickets_bp.get("/<int:ticket_id>")
@require_permission("tickets:view:own")
def get_ticket_details(ticket_id):
    """Customer views details of their own ticket including notes."""
    user_id = g.user["user_id"]
    
    ticket = Ticket.query.filter_by(id=ticket_id, user_id=user_id).first()
    if not ticket:
        return {"msg": "Ticket not found"}, 404
    
    # Get notes (exclude internal notes for customers)
    notes = TicketNote.query.filter_by(
        ticket_id=ticket_id,
        is_internal=False
    ).order_by(TicketNote.created_at.asc()).all()
    
    return jsonify({
        "ticket": ticket.to_dict(),
        "notes": [n.to_dict() for n in notes]
    })


@tickets_bp.post("/<int:ticket_id>/notes")
@require_permission("tickets:create:own")
@limiter.limit("50 per hour")
def add_customer_note(ticket_id):
    """Customer adds a note/reply to their ticket."""
    user_id = g.user["user_id"]
    
    ticket = Ticket.query.filter_by(id=ticket_id, user_id=user_id).first()
    if not ticket:
        return {"msg": "Ticket not found"}, 404
    
    data = request.get_json() or {}
    message = data.get("message")
    
    if not message:
        return {"msg": "message is required"}, 400
    
    note = TicketNote(
        ticket_id=ticket_id,
        author_id=user_id,
        author_role="customer",
        message=message,
        is_internal=False
    )
    
    # Update ticket status if it was resolved
    if ticket.status == "Resolved":
        ticket.status = "In Progress"
    
    ticket.updated_at = datetime.utcnow()
    
    db.session.add(note)
    db.session.commit()
    
    return note.to_dict(), 201


@tickets_bp.get("/all")
@require_permission("tickets:view:any")
def list_all_tickets():
    """Support agent views all tickets in the system."""
    # Optional filters
    status = request.args.get("status")
    priority = request.args.get("priority")
    assigned_to_me = request.args.get("assigned_to_me")
    
    query = Ticket.query
    
    if status:
        if status not in ["Open", "In Progress", "Resolved", "Closed"]:
            return {"msg": "Invalid status"}, 400
        query = query.filter_by(status=status)
    
    if priority:
        if priority not in ["Low", "Medium", "High", "Urgent"]:
            return {"msg": "Invalid priority"}, 400
        query = query.filter_by(priority=priority)
    
    if assigned_to_me == "true":
        query = query.filter_by(assigned_to=g.user["user_id"])
    
    tickets = query.order_by(Ticket.created_at.desc()).all()
    
    return jsonify([t.to_dict() for t in tickets])


@tickets_bp.get("/all/<int:ticket_id>")
@require_permission("tickets:view:any")
def get_any_ticket_details(ticket_id):
    """Support agent views any ticket details including all notes."""
    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return {"msg": "Ticket not found"}, 404
    
    # Support agents can see all notes including internal ones
    notes = TicketNote.query.filter_by(ticket_id=ticket_id).order_by(TicketNote.created_at.asc()).all()
    
    return jsonify({
        "ticket": ticket.to_dict(),
        "notes": [n.to_dict() for n in notes]
    })


@tickets_bp.put("/<int:ticket_id>/status")
@require_permission("tickets:update:any")
@limiter.limit("100 per hour")
def update_ticket_status(ticket_id):
    """Support agent updates ticket status."""
    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return {"msg": "Ticket not found"}, 404
    
    data = request.get_json() or {}
    new_status = data.get("status")
    
    if not new_status:
        return {"msg": "status is required"}, 400
    
    if new_status not in ["Open", "In Progress", "Resolved", "Closed"]:
        return {"msg": "Invalid status. Must be: Open, In Progress, Resolved, or Closed"}, 400
    
    ticket.status = new_status
    ticket.updated_at = datetime.utcnow()
    
    if new_status == "Resolved":
        ticket.resolved_at = datetime.utcnow()
    
    db.session.commit()
    
    return ticket.to_dict(), 200


@tickets_bp.put("/<int:ticket_id>/assign")
@require_permission("tickets:update:any")
def assign_ticket(ticket_id):
    """Support agent assigns ticket to themselves or another agent."""
    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return {"msg": "Ticket not found"}, 404
    
    data = request.get_json() or {}
    assigned_to = data.get("assigned_to")  # user_id of support agent, or null for self-assign
    
    # If assigned_to is null or not provided, assign to current user (self-assign)
    if assigned_to is None:
        assigned_to = g.user["user_id"]
    
    ticket.assigned_to = assigned_to
    ticket.updated_at = datetime.utcnow()
    
    if assigned_to and ticket.status == "Open":
        ticket.status = "In Progress"
    
    db.session.commit()
    
    return ticket.to_dict(), 200


@tickets_bp.post("/<int:ticket_id>/notes/agent")
@require_permission("tickets:update:any")
@limiter.limit("100 per hour")
def add_agent_note(ticket_id):
    """Support agent adds a note to any ticket."""
    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return {"msg": "Ticket not found"}, 404
    
    data = request.get_json() or {}
    message = data.get("message")
    is_internal = data.get("is_internal", False)
    
    if not message:
        return {"msg": "message is required"}, 400
    
    note = TicketNote(
        ticket_id=ticket_id,
        author_id=g.user["user_id"],
        author_role="support_agent",
        message=message,
        is_internal=is_internal
    )
    
    ticket.updated_at = datetime.utcnow()
    
    db.session.add(note)
    db.session.commit()
    
    return note.to_dict(), 201
