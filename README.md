# SafeBank
Banking app that is safe

## Backend Services

The SafeBank backend is built using a microservices architecture with the following services:

### 1. **Auth Service** (Port 5001)
Handles user authentication, registration, and role/permission management.
- User registration and login
- JWT token generation
- Role-based access control (RBAC)
- User profile management

### 2. **Accounts Service** (Port 5002)
Manages bank accounts and transactions.
- Account creation and management (checking/savings)
- Internal transfers (between own accounts)
- External transfers (to other users)
- Transaction history with advanced filtering:
  - Filter by date range
  - Filter by transaction type (internal/external)
  - Filter by amount range
  - Export to PDF
- Balance tracking and account status management

### 3. **Admin Service** (Port 5003)
Provides administrative capabilities for managing the system.
- Admin credential management
- User profile and role editing
- Support agent and auditor creation
- User listing and details

See `backend/admin_service/README.md` for detailed API documentation.

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Python 3.11+ (for running test scripts)

### Running the Services

1. Navigate to the backend directory:
```bash
cd backend
```

2. Generate JWT keys (first time only):
```bash
python generate_jwt_keys.py
```

This creates RSA key pairs in the `keys/` directory for secure JWT signing with RS256 algorithm.

3. Start all services:
```bash
docker-compose up
```

Or to rebuild containers after dependency changes:
```bash
docker-compose up --build
```

4. Initialize the database (first time only):
```bash
# In a new terminal
docker exec -it auth_service flask seed
```

### Default Admin Account

The system comes with a default admin account:
- **Email:** `admin@example.com`
- **Password:** `Admin@2024!`

**Important:** On first login, the system will require you to change the default password for security. Use the force password change endpoint before attempting regular login.

### First-Time Admin Password Change

Before you can login, change the default admin password:

**Using Postman or curl:**
```bash
POST http://localhost:5001/auth/force-password-change
Content-Type: application/json

{
  "email": "admin@example.com",
  "current_password": "Admin@2024!",
  "new_password": "YourSecurePassword123!"
}
```

Then login normally:
```bash
POST http://localhost:5001/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "YourSecurePassword123!"
}
```

### Testing the Admin Service

A test script is provided to demonstrate admin functionality:

```bash
# Make sure services are running
cd backend
python test_admin_service.py
```

## Architecture

```
SafeBank/
├── backend/
│   ├── auth_service/          # Authentication & Authorization
│   ├── accounts_service/      # Account & Transaction Management
│   ├── admin_service/         # Administrative Functions
│   ├── common/                # Shared utilities (JWT, RBAC)
│   └── docker-compose.yaml    # Service orchestration
└── frontend/                  # Web interface (TBD)
```

## Security Features

- **RS256 JWT Authentication**: Asymmetric cryptography for secure token signing
  - Private key (auth service only) signs tokens
  - Public key (all services) verifies tokens
  - Prevents token forgery even if other services are compromised
- **Forced Password Change**: Default admin must change password on first login
- **Strong Password Validation**: Enforces 8+ characters with complexity requirements
- **Role-Based Access Control**: Fine-grained permissions
- **Password Hashing**: PBKDF2-SHA256 for secure password storage
- **Service Isolation**: Each service has its own database
- **Audit Logging**: Admin actions are logged with user IDs and timestamps

## User Roles

- **Admin**: Full system access, user management
- **Support Agent**: Customer support capabilities
- **Auditor**: Read-only access for compliance
- **Customer**: Standard banking operations

