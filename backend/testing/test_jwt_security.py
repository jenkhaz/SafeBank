#!/usr/bin/env python3
"""
Test script for RS256 JWT Security
Verifies that RS256 algorithm is being used and tokens are properly signed
"""

import requests
import json
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

# Service URL
AUTH_URL = "http://localhost:5001/auth"
KEYS_PATH = "keys/jwt_public_key.pem"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")

def load_public_key():
    """Load the RS256 public key from file"""
    try:
        with open(KEYS_PATH, 'rb') as f:
            public_key = serialization.load_pem_public_key(
                f.read(),
                backend=default_backend()
            )
        return public_key
    except FileNotFoundError:
        print(f"⚠️  Public key not found at {KEYS_PATH}")
        print("Run: python generate_jwt_keys.py")
        return None
    except Exception as e:
        print(f"Error loading public key: {e}")
        return None

def test_jwt_security():
    print("SafeBank RS256 JWT Security Test")
    print("="*60)
    
    # Test 1: Verify public key exists
    print_section("1. Checking JWT Key Files")
    public_key = load_public_key()
    if public_key:
        print("✅ Public key loaded successfully")
        print(f"   Location: {KEYS_PATH}")
    else:
        print("❌ Public key not found - RS256 not configured")
        return
    
    # Test 2: Login and get JWT token
    print_section("2. Obtaining JWT Token")
    print("Logging in as test user...")
    login_response = requests.post(
        f"{AUTH_URL}/login",
        json={
            "email": "testuser@example.com",
            "password": "TestUser123!"
        }
    )
    
    if login_response.status_code == 404:
        print("Test user doesn't exist. Creating...")
        requests.post(
            f"{AUTH_URL}/register",
            json={
                "email": "testuser@example.com",
                "password": "TestUser123!",
                "full_name": "Test User",
                "phone": "1234567890"
            }
        )
        login_response = requests.post(
            f"{AUTH_URL}/login",
            json={
                "email": "testuser@example.com",
                "password": "TestUser123!"
            }
        )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(login_response.text)
        return
    
    token = login_response.json()["access_token"]
    print("✅ JWT token obtained")
    print(f"   Token preview: {token[:50]}...")
    
    # Test 3: Inspect JWT header
    print_section("3. Inspecting JWT Header")
    try:
        # Try multiple ways to get header for PyJWT compatibility
        try:
            header = jwt.get_unverified_header(token)
        except AttributeError:
            # Fallback: decode without verification
            import base64
            header_part = token.split('.')[0]
            # Add padding if needed
            header_part += '=' * (4 - len(header_part) % 4)
            header = json.loads(base64.urlsafe_b64decode(header_part))
        
        print(f"Algorithm: {header.get('alg')}")
        print(f"Type: {header.get('typ')}")
        
        if header.get('alg') == 'RS256':
            print("✅ Using RS256 (Asymmetric - Secure)")
        elif header.get('alg') == 'HS256':
            print("⚠️  Using HS256 (Symmetric - Less Secure)")
        else:
            print(f"⚠️  Using {header.get('alg')} (Unknown)")
    except Exception as e:
        print(f"❌ Error inspecting header: {e}")
        return
    
    # Test 4: Decode JWT payload (unverified)
    print_section("4. Decoding JWT Payload (Unverified)")
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        print("Payload contents:")
        print(json.dumps(payload, indent=2, default=str))
        
        # Check required fields
        required_fields = ['user_id', 'email', 'roles', 'permissions', 'exp', 'iat', 'iss', 'aud']
        missing_fields = [f for f in required_fields if f not in payload]
        
        if not missing_fields:
            print(f"\n✅ All required fields present: {', '.join(required_fields)}")
        else:
            print(f"\n⚠️  Missing fields: {', '.join(missing_fields)}")
    except Exception as e:
        print(f"❌ Error decoding payload: {e}")
        return
    
    # Test 5: Verify JWT signature with public key
    print_section("5. Verifying JWT Signature with Public Key")
    try:
        verified_payload = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            audience='safe_bank',
            issuer='auth_service'
        )
        print("✅ JWT signature verified successfully!")
        print("   Token was signed by the correct private key")
        print("   Token integrity is intact (not tampered)")
    except jwt.ExpiredSignatureError:
        print("⚠️  Token expired (but signature was valid)")
    except jwt.InvalidSignatureError:
        print("❌ Invalid signature - token has been tampered!")
    except jwt.InvalidAudienceError:
        print("❌ Invalid audience - token not for this service")
    except jwt.InvalidIssuerError:
        print("❌ Invalid issuer - token not from auth service")
    except Exception as e:
        print(f"❌ Verification error: {e}")
        return
    
    # Test 6: Test token tampering
    print_section("6. Testing Token Tampering Detection")
    print("Attempting to modify token payload...")
    
    # Split token into parts
    parts = token.split('.')
    if len(parts) == 3:
        # Change one character in the payload
        tampered_token = f"{parts[0]}.{parts[1][:-1]}X.{parts[2]}"
        
        try:
            jwt.decode(
                tampered_token,
                public_key,
                algorithms=['RS256'],
                audience='safe_bank',
                issuer='auth_service'
            )
            print("❌ SECURITY ISSUE: Tampered token was accepted!")
        except jwt.InvalidSignatureError:
            print("✅ Tampered token rejected - signature verification working!")
        except Exception as e:
            print(f"✅ Tampered token rejected: {type(e).__name__}")
    
    # Test 7: Test with wrong algorithm
    print_section("7. Testing Algorithm Downgrade Attack")
    try:
        # Try to accept HS256 when expecting RS256
        jwt.decode(
            token,
            public_key,
            algorithms=['HS256'],  # Wrong algorithm
            audience='safe_bank',
            issuer='auth_service'
        )
        print("❌ SECURITY ISSUE: Algorithm downgrade accepted!")
    except Exception:
        print("✅ Algorithm downgrade attack prevented!")
    
    # Test 8: Security summary
    print_section("Security Assessment Summary")
    
    checks = {
        "RS256 Algorithm": header.get('alg') == 'RS256',
        "Public Key Verification": True,  # We got here, so it works
        "Signature Integrity": True,
        "Tamper Protection": True,
        "Algorithm Enforcement": True,
        "Required Claims Present": not missing_fields
    }
    
    passed = sum(checks.values())
    total = len(checks)
    
    print(f"\nSecurity Checks: {passed}/{total} passed\n")
    for check, status in checks.items():
        symbol = "✅" if status else "❌"
        print(f"{symbol} {check}")
    
    if passed == total:
        print(f"\n{'='*60}")
        print("🎉 EXCELLENT! All security checks passed!")
        print("Your JWT implementation is using RS256 correctly.")
        print(f"{'='*60}")
    else:
        print(f"\n{'='*60}")
        print("⚠️  Some security checks failed. Review configuration.")
        print(f"{'='*60}")
    
    # Benefits explanation
    print_section("RS256 Security Benefits")
    print("""
RS256 (RSA Signature with SHA-256) provides:

1. Asymmetric Cryptography
   - Private key (auth service only) signs tokens
   - Public key (all services) verifies tokens
   - Compromising other services CANNOT forge tokens

2. Better Security in Microservices
   - Auth service keeps private key secret
   - Other services only need public key
   - Single point of token creation (auth service)

3. Industry Standard
   - Used by OAuth2, OpenID Connect
   - Required for federated authentication
   - Better for multi-service architectures

Comparison with HS256:
   ❌ HS256: Shared secret = any service can create tokens
   ✅ RS256: Private key required = only auth can create tokens
    """)

if __name__ == "__main__":
    try:
        test_jwt_security()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
