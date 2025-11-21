# Support Service API Documentation

## Overview
The Support Service handles customer support tickets and provides support agents with read-only access to customer accounts and transactions.

**Base URL:** `http://localhost:5004`

---

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Customer Endpoints

### Create Ticket
**POST** `/tickets/`

**Permission:** `tickets:create:own`

**Body:**
```json
{
  "subject": "Cannot login to my account",
  "description": "I forgot my password and the reset link isn't working",
  "priority": "High"
}
```

**Priority Options:** `Low`, `Medium`, `High`, `Urgent`

**Response (201):**
```json
{
  "id": 1,
  "user_id": 13,
  "subject": "Cannot login to my account",
  "description": "I forgot my password...",
  "status": "Open",
  "priority": "High",
  "assigned_to": null,
  "created_at": "2025-11-20T10:00:00",
  "updated_at": "2025-11-20T10:00:00",
  "resolved_at": null
}
```

---

### List My Tickets
**GET** `/tickets/`

**Permission:** `tickets:view:own`

**Query Parameters:**
- `status` (optional): `Open`, `In Progress`, `Resolved`, `Closed`

**Response (200):**
```json
[
  {
    "id": 1,
    "user_id": 13,
    "subject": "Cannot login to my account",
    "status": "In Progress",
    "priority": "High",
    "created_at": "2025-11-20T10:00:00",
    ...
  }
]
```

---

### Get Ticket Details
**GET** `/tickets/<ticket_id>`

**Permission:** `tickets:view:own`

**Response (200):**
```json
{
  "ticket": {
    "id": 1,
    "subject": "Cannot login",
    "status": "In Progress",
    ...
  },
  "notes": [
    {
      "id": 1,
      "author_id": 5,
      "author_role": "support_agent",
      "message": "We're looking into this issue",
      "created_at": "2025-11-20T10:30:00"
    }
  ]
}
```

---

### Add Note to Ticket
**POST** `/tickets/<ticket_id>/notes`

**Permission:** `tickets:create:own`

**Body:**
```json
{
  "message": "I tried resetting again but still not working"
}
```

**Response (201):**
```json
{
  "id": 2,
  "ticket_id": 1,
  "author_id": 13,
  "author_role": "customer",
  "message": "I tried resetting again...",
  "is_internal": false,
  "created_at": "2025-11-20T11:00:00"
}
```

---

## Support Agent Endpoints

### View All Tickets
**GET** `/tickets/all`

**Permission:** `tickets:view:any`

**Query Parameters:**
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority
- `assigned_to_me=true` (optional): Show only tickets assigned to me

**Response (200):**
```json
[
  {
    "id": 1,
    "user_id": 13,
    "subject": "Cannot login",
    "status": "Open",
    "priority": "High",
    "assigned_to": null,
    ...
  }
]
```

---

### View Any Ticket Details
**GET** `/tickets/all/<ticket_id>`

**Permission:** `tickets:view:any`

**Response (200):**
```json
{
  "ticket": {...},
  "notes": [
    {
      "id": 1,
      "is_internal": true,
      "message": "Customer has account ID 13",
      ...
    }
  ]
}
```

**Note:** Support agents see ALL notes including internal ones.

---

### Update Ticket Status
**PUT** `/tickets/<ticket_id>/status`

**Permission:** `tickets:update:any`

**Body:**
```json
{
  "status": "Resolved"
}
```

**Status Options:** `Open`, `In Progress`, `Resolved`, `Closed`

**Response (200):**
```json
{
  "id": 1,
  "status": "Resolved",
  "resolved_at": "2025-11-20T12:00:00",
  ...
}
```

---

### Assign Ticket
**PUT** `/tickets/<ticket_id>/assign`

**Permission:** `tickets:update:any`

**Body:**
```json
{
  "assign_to": 5
}
```

**Response (200):**
```json
{
  "id": 1,
  "assigned_to": 5,
  "status": "In Progress",
  ...
}
```

**Note:** Pass `"assign_to": null` to unassign.

---

### Add Agent Note
**POST** `/tickets/<ticket_id>/notes/agent`

**Permission:** `tickets:update:any`

**Body:**
```json
{
  "message": "Password reset link sent to customer email",
  "is_internal": false
}
```

**Response (201):**
```json
{
  "id": 3,
  "author_role": "support_agent",
  "is_internal": false,
  ...
}
```

**Note:** Set `is_internal: true` for notes only visible to support agents.

---

### View All Accounts (Read-Only)
**GET** `/support/accounts`

**Permission:** `accounts:view:any`

Proxies to: `GET http://accounts:5000/accounts/admin/all`

---

### View All Transactions (Read-Only)
**GET** `/support/transactions`

**Permission:** `transactions:view:any`

Proxies to: `GET http://accounts:5000/transactions/admin/all`

---

### View My Profile
**GET** `/support/profile`

**Permission:** `support_agent`

Proxies to: `GET http://auth:5000/auth/me/roles-permissions`

---

### View My Bank Account
**GET** `/support/my-account`

**Permission:** `accounts:view:own`

Proxies to: `GET http://accounts:5000/accounts/`

---

### View My Transactions
**GET** `/support/my-transactions`

**Permission:** `transactions:view:own`

Proxies to: `GET http://accounts:5000/transactions/`

---

## Support Agent Capabilities Summary

✅ **CAN:**
1. Register/login (same as customers)
2. Manage own profile
3. View own bank account
4. View ALL customer accounts (read-only)
5. View own transactions
6. View ALL transactions (read-only)
7. Manage support tickets (view all, update status, assign, add notes)

❌ **CANNOT:**
1. Create accounts for others
2. Make transfers (internal or external)
3. Freeze/unfreeze accounts
4. Assign or change user roles
5. View audit logs (future feature)

---

## Rate Limits
- Create ticket: 20 per hour
- Add customer note: 50 per hour
- Add agent note: 100 per hour
- Update ticket status: 100 per hour
- Default: 500 per day, 100 per hour

---

## Database Schema

### Ticket
- id (PK)
- user_id (customer who created)
- subject
- description
- status (Open, In Progress, Resolved, Closed)
- priority (Low, Medium, High, Urgent)
- assigned_to (support agent user_id, nullable)
- created_at, updated_at, resolved_at

### TicketNote
- id (PK)
- ticket_id (FK)
- author_id (user_id)
- author_role (customer, support_agent)
- message
- is_internal (boolean - only visible to support agents)
- created_at

---

## To Deploy

1. **Update auth service permissions** (already done in seed.py)
2. **Rebuild services:**
   ```bash
   cd backend
   docker-compose down -v
   docker-compose up --build -d
   ```
3. **Support service runs on port 5004**
4. **Test endpoints with Postman**
