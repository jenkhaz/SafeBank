# RS256 Migration - Complete Implementation Guide

## Prerequisites
```bash
pip install cryptography  # For key generation
```

## Step 1: Generate Keys (Run Once)
```bash
cd backend
python generate_jwt_keys.py
```

This creates:
- `keys/jwt_private_key.pem` (Auth Service only)
- `keys/jwt_public_key.pem` (All services)
- Updates `.gitignore` automatically

## Step 2: Replace JWT Helper

### Option A: Replace existing file
```bash
# Backup current file
cp common/security/jwt_helpers.py common/security/jwt_helpers_hs256_backup.py

# Replace with RS256 version
cp common/security/jwt_helpers_rs256.py common/security/jwt_helpers.py
```

### Option B: Update imports (recommended)
In `auth_service/app/routes/auth.py`, change:
```python
# OLD
from common.security.jwt_helpers import require_jwt
import jwt

# NEW
from common.security.jwt_helpers_rs256 import require_jwt, create_jwt
```

Then replace `jwt.encode(...)` with `create_jwt(payload)` in login function.

## Step 3: Update docker-compose.yaml

Add key mounts to each service:

```yaml
services:
  auth:
    volumes:
      - ./keys:/app/keys:ro
    environment:
      - JWT_PRIVATE_KEY_PATH=/app/keys/jwt_private_key.pem
      - JWT_PUBLIC_KEY_PATH=/app/keys/jwt_public_key.pem
      # Remove: JWT_SECRET_KEY

  accounts:
    volumes:
      - ./keys/jwt_public_key.pem:/app/keys/jwt_public_key.pem:ro
    environment:
      - JWT_PUBLIC_KEY_PATH=/app/keys/jwt_public_key.pem
      # Remove: JWT_SECRET_KEY

  admin:
    volumes:
      - ./keys/jwt_public_key.pem:/app/keys/jwt_public_key.pem:ro
    environment:
      - JWT_PUBLIC_KEY_PATH=/app/keys/jwt_public_key.pem
      # Remove: JWT_SECRET_KEY
```

## Step 4: Test
```bash
# Restart services
docker-compose down
docker-compose up

# Test login
curl -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@2024!"}'

# Should return JWT token signed with RS256
```

## Step 5: Verify RS256
```python
# Decode token to check algorithm
import jwt
token = "eyJ..."  # Your token
header = jwt.get_unverified_header(token)
print(header['alg'])  # Should print: RS256
```

## Security Checklist
- [ ] Keys generated
- [ ] keys/ added to .gitignore
- [ ] Private key only on Auth Service
- [ ] Public key on all services
- [ ] Removed JWT_SECRET_KEY from env
- [ ] JWT_SECRET_KEY removed from docker-compose
- [ ] Tested login flow
- [ ] Tested admin operations
- [ ] Backed up private key securely

## Rollback Plan
If something goes wrong:
```bash
# Restore old JWT helper
cp common/security/jwt_helpers_hs256_backup.py common/security/jwt_helpers.py

# Revert docker-compose changes
git checkout docker-compose.yaml

# Restart
docker-compose restart
```

## Production Deployment
For production, use proper secret management:

### AWS Secrets Manager
```python
import boto3

def load_private_key():
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId='jwt-private-key')
    return response['SecretString'].encode()
```

### HashiCorp Vault
```python
import hvac

def load_private_key():
    client = hvac.Client(url='http://vault:8200')
    secret = client.secrets.kv.v2.read_secret_version(path='jwt-private-key')
    return secret['data']['data']['key'].encode()
```

## Benefits After Migration
✅ Services can only verify tokens, not create them
✅ Compromising admin/accounts service doesn't expose signing key
✅ Industry-standard algorithm (OAuth2, OpenID Connect)
✅ Better security posture for microservices
✅ Easier key rotation without service restarts

## Performance Impact
- Signing (Auth Service): ~2-3ms slower (negligible)
- Verification (All Services): ~1ms slower (negligible)
- Overall: No noticeable impact on API response times
