# SafeBank Test Suite

Comprehensive test scripts for all SafeBank services and security features.

## Test Files

### 1. `test_jwt_security.py`
Tests RS256 JWT implementation and security features.

**Tests:**
- JWT key file existence
- RS256 algorithm verification
- JWT signature validation
- Token tampering detection
- Algorithm downgrade protection
- Security assessment summary

**Run:**
```bash
python test_jwt_security.py
```

### 2. `test_auth_service.py`
Tests authentication service functionality.

**Tests:**
- User registration
- User login with JWT generation
- JWT token inspection (RS256 verification)
- Roles and permissions retrieval
- Password strength validation
- Email format validation
- Forced password change flow
- Invalid credentials handling
- Missing fields validation

**Run:**
```bash
python test_auth_service.py
```

### 3. `test_accounts_service.py`
Tests banking operations and account management.

**Tests:**
- Account creation (checking & savings)
- Deposit transactions
- Withdrawal transactions
- Transfer between accounts
- Transaction history
- Balance tracking
- Overdraft protection
- Negative amount validation
- Invalid account access

**Run:**
```bash
python test_accounts_service.py
```

### 4. `test_admin_service.py`
Tests administrative functionality.

**Tests:**
- Admin login with forced password change
- Admin credential updates
- Support agent creation
- Auditor creation
- User listing
- User profile editing
- User details retrieval

**Run:**
```bash
python test_admin_service.py
```

### 5. `run_all_tests.py`
Runs all tests in sequence with summary.

**Run:**
```bash
python run_all_tests.py
```

## Prerequisites

1. **Services must be running:**
```bash
cd backend
docker-compose up
```

2. **Install test dependencies:**
```bash
pip install requests PyJWT cryptography
```

3. **Generate JWT keys (first time only):**
```bash
cd backend
python generate_jwt_keys.py
```

## Quick Start

Run all tests at once:
```bash
cd backend
python run_all_tests.py
```

Or run individual tests:
```bash
# Test JWT security first
python test_jwt_security.py

# Test authentication
python test_auth_service.py

# Test banking operations
python test_accounts_service.py

# Test admin functions
python test_admin_service.py
```

## Expected Output

Each test script provides:
- ✅ Success indicators for passing tests
- ❌ Failure indicators with error details
- Detailed response data from API calls
- Security analysis and recommendations
- Summary of all tests run

## Troubleshooting

### Connection Errors
```
Error: Could not connect to services
```
**Solution:** Make sure services are running:
```bash
cd backend
docker-compose up
```

### JWT Signature Errors
```
Algorithm 'RS256' could not be found
```
**Solution:** Install cryptography in containers:
```bash
cd backend
docker-compose up --build
```

### Missing Keys Error
```
Public key not found at keys/jwt_public_key.pem
```
**Solution:** Generate JWT keys:
```bash
cd backend
python generate_jwt_keys.py
```

### User Already Exists
This is normal - tests create users once and reuse them. The tests handle this automatically.

## Test Coverage

| Service | Feature | Test Coverage |
|---------|---------|---------------|
| Auth | Registration | ✅ Full |
| Auth | Login | ✅ Full |
| Auth | JWT Security | ✅ Full |
| Auth | Password Validation | ✅ Full |
| Auth | Forced Password Change | ✅ Full |
| Accounts | Account Creation | ✅ Full |
| Accounts | Transactions | ✅ Full |
| Accounts | Balance Tracking | ✅ Full |
| Admin | User Management | ✅ Full |
| Admin | Role Assignment | ✅ Full |
| Security | RS256 JWT | ✅ Full |
| Security | Token Tampering | ✅ Full |

## Security Tests

The JWT security test (`test_jwt_security.py`) verifies:

1. **RS256 Algorithm** - Asymmetric cryptography is used
2. **Public Key Verification** - Tokens can be verified with public key
3. **Signature Integrity** - Tokens haven't been tampered with
4. **Tamper Protection** - Modified tokens are rejected
5. **Algorithm Enforcement** - Algorithm downgrade attacks prevented
6. **Required Claims** - All necessary JWT claims present

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run SafeBank Tests
  run: |
    cd backend
    docker-compose up -d
    sleep 10  # Wait for services
    python generate_jwt_keys.py
    python run_all_tests.py
```

## Contributing

When adding new features:
1. Add corresponding tests to appropriate test file
2. Update this README with new test descriptions
3. Ensure `run_all_tests.py` includes new test files
4. Run full test suite before committing

## Support

For issues with tests:
1. Check service logs: `docker-compose logs <service_name>`
2. Verify JWT keys exist: `ls backend/keys/`
3. Ensure all dependencies installed: `pip install -r requirements.txt`
4. Check docker containers: `docker-compose ps`
