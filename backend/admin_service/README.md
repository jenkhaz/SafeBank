# Admin Service

The Admin Service provides administrative capabilities for managing users, roles, and permissions in the SafeBank system.

## Port
- **5003** (mapped from container port 5000)

## Endpoints

### Authentication
All endpoints require a valid JWT token with `admin` permission in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Available Endpoints

#### 1. Change Admin Credentials (First-time login)
**POST** `/admin/change-credentials`

Admin changes their own username (email) and/or password on first login.

**Request Body:**
```json
{
  "email": "newemail@example.com",      // Optional
  "password": "newSecurePassword123"    // Optional
}
```

**Response:** `200 OK`
```json
{
  "msg": "admin credentials updated, please login using the new credentials"
}
```

---

#### 2. Edit User Profile and Roles
**POST** `/admin/users/edit`

Edit any user's profile information and roles.

**Request Body:**
```json
{
  "user_id": 2,
  "email": "updated@example.com",       // Optional
  "full_name": "Updated Name",          // Optional
  "phone": "1234567890",                // Optional
  "is_active": true,                    // Optional
  "roles_to_add": ["support_agent"],    // Optional
  "roles_to_remove": ["customer"]       // Optional
}
```

**Response:** `200 OK`
```json
{
  "msg": "User profile updated",
  "user": {
    "id": 2,
    "email": "updated@example.com",
    "full_name": "Updated Name",
    "roles": ["support_agent"],
    "is_active": true
  }
}
```

---

#### 3. Create Support Agent
**POST** `/admin/users/create-support-agent`

Create a new support agent user with the `support_agent` role.

**Request Body:**
```json
{
  "email": "agent@example.com",
  "full_name": "Support Agent Name",
  "phone": "1234567890",                // Optional
  "password": "securePassword123"
}
```

**Response:** `201 Created`
```json
{
  "msg": "Support agent created successfully",
  "user": {
    "id": 3,
    "email": "agent@example.com",
    "full_name": "Support Agent Name",
    "roles": ["support_agent"],
    "is_active": true
  }
}
```

---

#### 4. Create Auditor
**POST** `/admin/users/create-auditor`

Create a new auditor user with the `auditor` role.

**Request Body:**
```json
{
  "email": "auditor@example.com",
  "full_name": "Auditor Name",
  "phone": "1234567890",                // Optional
  "password": "securePassword123"
}
```

**Response:** `201 Created`
```json
{
  "msg": "Auditor created successfully",
  "user": {
    "id": 4,
    "email": "auditor@example.com",
    "full_name": "Auditor Name",
    "roles": ["auditor"],
    "is_active": true
  }
}
```

---

#### 5. List All Users
**GET** `/admin/users/list`

Get a list of all users in the system.

**Response:** `200 OK`
```json
{
  "users": [
    {
      "id": 1,
      "email": "admin@example.com",
      "full_name": "Default Admin",
      "roles": ["admin"],
      "is_active": true
    },
    {
      "id": 2,
      "email": "customer@example.com",
      "full_name": "John Doe",
      "roles": ["customer"],
      "is_active": true
    }
  ]
}
```

---

#### 6. Get User Details
**GET** `/admin/users/<user_id>`

Get detailed information about a specific user.

**Response:** `200 OK`
```json
{
  "user": {
    "id": 2,
    "email": "customer@example.com",
    "full_name": "John Doe",
    "roles": ["customer"],
    "is_active": true
  }
}
```

---

## Default Admin Account

The system comes with a default admin account:
- **Email:** `admin@example.com`
- **Password:** `Admin@2024!`

**⚠️ CRITICAL SECURITY:** 
- The admin **MUST** change their password on first login (enforced by system)
- Login will fail with `403 Forbidden` and `must_change_password: true` flag
- Use the `/auth/force-password-change` endpoint to set a new password
- After password change, normal login will work

### First-Time Admin Login Flow

1. **Attempt to login** with default credentials:
```bash
curl -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@2024!"
  }'
```

**Response (403):**
```json
{
  "msg": "Password change required",
  "must_change_password": true,
  "user_id": 1
}
```

2. **Force password change** (no JWT required):
```bash
curl -X POST http://localhost:5001/auth/force-password-change \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "current_password": "Admin@2024!",
    "new_password": "YourSecurePassword123!"
  }'
```

3. **Login with new password**:
```bash
curl -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "YourSecurePassword123!"
  }'
```

## Architecture

The Admin Service is a **stateless proxy service** that forwards authenticated requests to the Auth Service. It doesn't have its own database but relies on the Auth Service for user management operations.

### Service Dependencies
- **Auth Service** (required): For user authentication and management

## Running the Service

The admin service is included in the docker-compose setup:

```bash
cd backend
docker-compose up admin
```

Or run all services:
```bash
docker-compose up
```

## Example Usage Flow

### 1. First-time Admin Login
```bash
# Login as default admin
curl -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'

# Response includes JWT token
# {"access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...", "user": {...}}
```

### 2. Change Admin Credentials
```bash
# Use the JWT token from login
curl -X POST http://localhost:5003/admin/change-credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "email": "admin@safebank.com",
    "password": "NewSecurePassword123!"
  }'
```

### 3. Create Support Agent
```bash
curl -X POST http://localhost:5003/admin/users/create-support-agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "email": "support@safebank.com",
    "full_name": "Support Agent",
    "phone": "1234567890",
    "password": "AgentPassword123"
  }'
```

### 4. Edit User Profile
```bash
curl -X POST http://localhost:5003/admin/users/edit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "user_id": 2,
    "is_active": false,
    "roles_to_add": ["auditor"]
  }'
```

## Error Responses

- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: Invalid or missing JWT token
- `403 Forbidden`: Insufficient permissions (not admin)
- `404 Not Found`: User not found
- `503 Service Unavailable`: Cannot connect to Auth Service
