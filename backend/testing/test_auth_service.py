#!/usr/bin/env python3
"""
Test script for Auth Service functionality
Tests user registration, login, forced password change, and JWT authentication
"""

import requests
import json
import jwt

# Service URL
AUTH_URL = "http://localhost:5001/auth"

def print_response(response, title="Response"):
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)

def decode_token(token):
    """Decode JWT token without verification to inspect contents"""
    try:
        # Decode without verification to see the payload
        decoded = jwt.decode(token, options={"verify_signature": False})
        print(f"\n{'='*60}")
        print("JWT Token Payload")
        print(f"{'='*60}")
        print(json.dumps(decoded, indent=2))
        
        # Check algorithm in header
        try:
            header = jwt.get_unverified_header(token)
        except AttributeError:
            # Fallback: decode header manually
            import base64
            header_part = token.split('.')[0]
            header_part += '=' * (4 - len(header_part) % 4)
            header = json.loads(base64.urlsafe_b64decode(header_part))
        
        print(f"\nJWT Algorithm: {header.get('alg')}")
        print(f"Expected: RS256 (Asymmetric)")
        if header.get('alg') == 'RS256':
            print("✅ Using secure RS256 algorithm!")
        else:
            print(f"⚠️  Using {header.get('alg')} - should be RS256")
    except Exception as e:
        print(f"Could not decode token: {e}")

def main():
    print("SafeBank Auth Service Test Script")
    print("="*60)
    
    # Test 1: Register new user
    print("\n1. Registering new user...")
    register_response = requests.post(
        f"{AUTH_URL}/register",
        json={
            "email": "testuser@example.com",
            "password": "TestUser123!",
            "full_name": "Test User",
            "phone": "1234567890"
        }
    )
    print_response(register_response, "User Registration")
    
    if register_response.status_code == 400 and "already exists" in register_response.text:
        print("Note: User already exists, continuing with login tests...")
    
    # Test 2: Login with new user
    print("\n2. Logging in as test user...")
    login_response = requests.post(
        f"{AUTH_URL}/login",
        json={
            "email": "testuser@example.com",
            "password": "TestUser123!"
        }
    )
    print_response(login_response, "User Login")
    
    if login_response.status_code != 200:
        print("Login failed. Cannot continue tests.")
        return
    
    token = login_response.json()["access_token"]
    user_data = login_response.json()["user"]
    
    # Decode and inspect the JWT token
    decode_token(token)
    
    # Test 3: Get roles and permissions
    print("\n3. Getting user roles and permissions...")
    headers = {"Authorization": f"Bearer {token}"}
    roles_response = requests.get(
        f"{AUTH_URL}/me/roles-permissions",
        headers=headers
    )
    print_response(roles_response, "Roles and Permissions")
    
    # Test 4: Test weak password validation
    print("\n4. Testing weak password validation...")
    weak_pass_response = requests.post(
        f"{AUTH_URL}/register",
        json={
            "email": "weakuser@example.com",
            "password": "weak",
            "full_name": "Weak Password User",
            "phone": "1111111111"
        }
    )
    print_response(weak_pass_response, "Weak Password Test (should fail)")
    
    # Test 5: Test invalid email validation
    print("\n5. Testing invalid email validation...")
    invalid_email_response = requests.post(
        f"{AUTH_URL}/register",
        json={
            "email": "notanemail",
            "password": "ValidPass123!",
            "full_name": "Invalid Email User",
            "phone": "2222222222"
        }
    )
    print_response(invalid_email_response, "Invalid Email Test (should fail)")
    
    # Test 6: Test forced password change flow
    print("\n6. Testing forced password change (admin account)...")
    print("   a. Try to login with default admin password...")
    admin_login_response = requests.post(
        f"{AUTH_URL}/login",
        json={
            "email": "admin@example.com",
            "password": "Admin@2024!"
        }
    )
    print_response(admin_login_response, "Admin Login (may require password change)")
    
    if admin_login_response.status_code == 403:
        must_change = admin_login_response.json().get("must_change_password")
        if must_change:
            print("\n   b. Admin must change password - testing force change endpoint...")
            force_change_response = requests.post(
                f"{AUTH_URL}/force-password-change",
                json={
                    "email": "admin@example.com",
                    "current_password": "Admin@2024!",
                    "new_password": "NewAdminPassword123!"
                }
            )
            print_response(force_change_response, "Force Password Change")
            
            if force_change_response.status_code == 200:
                print("\n   c. Logging in with new password...")
                new_login_response = requests.post(
                    f"{AUTH_URL}/login",
                    json={
                        "email": "admin@example.com",
                        "password": "NewAdminPassword123!"
                    }
                )
                print_response(new_login_response, "Admin Login (after password change)")
                
                if new_login_response.status_code == 200:
                    admin_token = new_login_response.json()["access_token"]
                    print("\n   d. Inspecting admin JWT token...")
                    decode_token(admin_token)
    
    # Test 7: Test invalid credentials
    print("\n7. Testing invalid credentials...")
    invalid_login_response = requests.post(
        f"{AUTH_URL}/login",
        json={
            "email": "testuser@example.com",
            "password": "WrongPassword123!"
        }
    )
    print_response(invalid_login_response, "Invalid Login (should fail)")
    
    # Test 8: Test missing fields
    print("\n8. Testing registration with missing fields...")
    missing_fields_response = requests.post(
        f"{AUTH_URL}/register",
        json={
            "email": "incomplete@example.com"
        }
    )
    print_response(missing_fields_response, "Missing Fields (should fail)")
    
    print("\n" + "="*60)
    print("✅ Auth Service Test completed!")
    print("="*60)
    print("\nSummary:")
    print("- User registration and login")
    print("- JWT token generation with RS256")
    print("- Password strength validation")
    print("- Email format validation")
    print("- Forced password change flow")
    print("- Invalid credential handling")
    print("="*60)

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\nError: Could not connect to auth service.")
        print("Make sure the services are running:")
        print("  cd backend && docker-compose up")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
