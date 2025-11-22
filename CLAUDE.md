# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeBank is a microservices-based online banking platform built with Flask. The backend uses a microservices architecture with isolated services communicating via HTTP/REST APIs. Each service has its own SQLite database and is containerized with Docker.

## Architecture

### Microservices Structure

The system consists of 4 independent services:

1. **Auth Service** (Port 5001) - Authentication and authorization
   - User registration, login, JWT token generation
   - Role-based access control (RBAC)
   - RS256 asymmetric JWT signing (private key holder)
   - User profile and permission management
   - Forced password changes for security

2. **Accounts Service** (Port 5002) - Banking operations
   - Account creation and management (checking/savings)
   - Transaction processing (deposits, withdrawals, internal/external transfers)
   - Balance tracking with Decimal precision (no Float)
   - Transaction history with filtering and PDF export
   - Account status management (Active/Frozen/Closed)

3. **Admin Service** (Port 5003) - Administrative functions
   - Admin credential management
   - User profile and role editing
   - Support agent and auditor creation
   - User listing and management
   - Proxies to Auth Service for operations

4. **Support Service** (Port 5004) - Customer support
   - Support ticket management with status tracking
   - Read-only access to all accounts and transactions
   - Internal notes (visible only to agents) and customer-facing notes
   - Ticket assignment and priority management

### Shared Components

**`backend/common/`** - Shared utilities across all services:
- `models.py` - SQLAlchemy models (User, Role, Account, Transaction, SupportTicket, AuditLog)
- `security/jwt_helpers.py` - RS256 JWT encoding/decoding with public/private key
- `security/rbac.py` - Permission decorators (`@require_permission()`)
- All services import from `common/` for consistency

### Key Architectural Patterns

1. **Database Isolation**: Each service has its own SQLite database mounted as Docker volume
2. **JWT Propagation**: Services verify JWTs using shared public key; only Auth Service can sign tokens
3. **Service Communication**: Admin and Support services proxy requests to Auth/Accounts services
4. **RBAC Model**: Permission-based access control, not just role-based (e.g., `accounts:view:own`, `tickets:update:any`)

## Development Commands

### Initial Setup

```bash
# First time: Generate RSA keypair for RS256 JWT
cd backend
python generate_jwt_keys.py

# Start all services
docker-compose up

# Rebuild after dependency changes
docker-compose up --build

# Initialize database (first time only)
docker exec -it auth_service flask seed
```

### Testing

```bash
# Run all tests
cd backend/testing
python run_all_tests.py

# Individual test suites
python test_jwt_security.py     # RS256 JWT security validation
python test_auth_service.py     # Authentication endpoints
python test_accounts_service.py # Banking operations
python test_admin_service.py    # Admin functionality
```

### Database Management

```bash
# Access database in running container
docker exec -it auth_service sqlite3 /data/auth.db

# Reset all data (WARNING: destructive)
docker-compose down -v
docker-compose up --build
docker exec -it auth_service flask seed
```

### Service Logs

```bash
# View logs for specific service
docker-compose logs -f auth
docker-compose logs -f accounts

# View all logs
docker-compose logs -f
```

## Critical Security Implementation

### RS256 JWT Authentication

The system uses **asymmetric RS256** (not HS256) for JWT signing:

- **Private Key** (`keys/jwt_private_key.pem`): Only Auth Service can sign tokens
- **Public Key** (`keys/jwt_public_key.pem`): All services verify tokens
- **Benefit**: Compromising non-auth services cannot forge tokens
- **Keys are git-ignored** and must be generated per deployment

JWT payload structure:
```python
{
    "user_id": 5,
    "roles": ["customer"],
    "permissions": ["accounts:view:own", "transactions:view:own"],
    "exp": 1700000000  # 15 minutes from issue
}
```

### Password Security

- **PBKDF2-SHA256** hashing for all passwords
- **Strong password requirements**: 8+ chars, uppercase, lowercase, digit, special character
- **Forced password change** on first login for default admin
- **Default admin**: `admin@example.com` / `Admin@2024!` (must be changed on first use)

### Rate Limiting

Implemented via Flask-Limiter with Redis backend (production):

- **Login**: 5 per 15 minutes (brute force protection)
- **Registration**: 5 per hour (spam prevention)
- **External transfers**: 10 per hour (fraud prevention)
- **Account creation**: 10 per day
- See `backend/RATE_LIMITING.md` for complete limits

### Monetary Precision

**CRITICAL**: All monetary values use `Decimal`, NOT `Float`, to prevent precision errors. When modifying transaction or account balance code, always use `Decimal` from Python's `decimal` module.

## Permission System

### Role Hierarchy

1. **Admin** - Full system access
2. **Support Agent** - View all accounts (read-only), manage tickets
3. **Auditor** - Read-only access for compliance
4. **Customer** - Standard banking operations

### Permission Naming Convention

Format: `resource:action:scope`

Examples:
- `accounts:view:own` - View your own accounts
- `accounts:view:any` - View any user's accounts (admin/support)
- `transactions:create:external` - Make external transfers
- `tickets:update:any` - Update any ticket (support agents)

### Using Permissions in Code

```python
from common.security.rbac import require_permission

@bp.get("/accounts/")
@require_permission("accounts:view:own")
def get_my_accounts():
    # g.user contains JWT payload with user_id, roles, permissions
    return accounts_for_user(g.user["user_id"])
```

## Database Models

All models in `backend/common/models.py`:

### Core Relationships

- **User** has many **Roles** (many-to-many via `user_roles`)
- **User** has many **Accounts** (one-to-many)
- **Account** has many **Transactions** (sender and receiver FKs)
- **User** has many **SupportTickets** (as customer and as assigned agent)
- **SupportTicket** has many **TicketNotes**

### Important Fields

- `User.must_change_password` - Forces password change on next login
- `Account.status` - Active/Frozen/Closed (validates on all operations)
- `Transaction.type` - deposit/withdrawal/internal/external
- `SupportTicket.priority` - Low/Medium/High/Urgent
- `TicketNote.is_internal` - Only visible to support agents if true

## Transaction Types

| Type | Sender | Receiver | Use Case |
|------|--------|----------|----------|
| `deposit` | Same account | Same account | ATM deposit, check deposit |
| `withdrawal` | Same account | Same account | ATM withdrawal |
| `internal` | User's account A | User's account B | Transfer between own accounts |
| `external` | User's account | Other user's account | Bill pay, send money |

All transactions validate:
- Account ownership (except external receiver)
- Account status (must be Active)
- Sufficient balance (withdrawals/transfers)
- Positive amounts

## Common Development Tasks

### Adding a New Permission

1. Add to `auth_service/app/seed.py` in appropriate role's permissions
2. Reset database or manually add via SQL
3. Use `@require_permission("new:permission")` decorator

### Adding a New Endpoint

1. Create route in appropriate service's `app/routes/` directory
2. Add RBAC decorator with required permissions
3. Add rate limiting decorator if sensitive
4. Update relevant API documentation in `backend/Guides/`

### Modifying Transaction Logic

1. **Always read** `backend/Guides/BANKING_OPERATIONS.md` first
2. Use `Decimal` for all monetary calculations
3. Validate account status, ownership, and balance
4. Update both sender and receiver balances atomically (use `db.session`)
5. Create Transaction record with proper type

### Testing New Features

1. Write test in `backend/testing/test_<service>_service.py`
2. Run individual test: `python test_<service>_service.py`
3. Run full suite: `python run_all_tests.py`
4. Verify in Postman using collections in `backend/` directory

## Docker Compose Configuration

Each service mounts:
- **Code directory** (`./service_name/app:/app/app`) - Hot reload in development
- **Common utilities** (`./common:/app/common`) - Shared across services
- **JWT keys** - Auth gets private+public, others only public (read-only)
- **Database volume** - Persisted data

Environment variables:
- `JWT_PRIVATE_KEY_PATH` - Auth Service only
- `JWT_PUBLIC_KEY_PATH` - All services
- `DATABASE_URL` - SQLite file path in volume
- `AUTH_SERVICE_URL`, `ACCOUNTS_SERVICE_URL` - For inter-service communication

## Important Files and Locations

- `backend/generate_jwt_keys.py` - Generate RS256 keypair (run once)
- `backend/docker-compose.yaml` - Service orchestration
- `backend/common/models.py` - All database models
- `backend/common/security/` - JWT and RBAC utilities
- `backend/testing/` - Test suite
- `backend/Guides/` - API documentation and security guides
- `backend/RATE_LIMITING.md` - Rate limit configuration
- `backend/Guides/SECURITY.md` - Security audit and recommendations

## Frontend (Minimal)

Currently basic static HTML/CSS in `frontend/` directory. Backend is API-first and frontend is not yet fully developed.

## Known Security Considerations

From `backend/Guides/SECURITY.md`:

- **Implemented**: RS256 JWT, rate limiting, strong passwords, forced password changes, audit logging
- **Missing**: HTTPS/TLS (use nginx in production), CSRF tokens, refresh tokens, account lockout after failed logins
- **Production TODO**: Use proper secrets manager (AWS Secrets Manager, HashiCorp Vault), not environment variables

## Debugging Tips

1. **Token Issues**: Check algorithm with `jwt.get_unverified_header(token)['alg']` - should be RS256
2. **Permission Denied**: Verify JWT payload has required permission in `permissions` array
3. **Database Locked**: Stop conflicting services with `docker-compose down`
4. **Rate Limited**: Wait for window to expire or increase limits in service code
5. **Inter-service 404**: Check service URLs in docker-compose environment variables

## Branch Strategy

- `main` - Production-ready code
- `frontend-dev` - Current development branch (per git status)
- Commit messages follow conventional format with Claude Code attribution
