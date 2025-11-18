#!/usr/bin/env python3
"""
Test script for Admin Service functionality
Run this after starting the services with docker-compose
"""

import requests
import json

# Service URLs
AUTH_URL = "http://localhost:5001/auth"
ADMIN_URL = "http://localhost:5003/admin"

def print_response(response, title="Response"):
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)

def main():
    print("SafeBank Admin Service Test Script")
    print("="*60)
    
    # Step 1: Login as default admin
    print("\n1. Logging in as default admin...")
    login_response = requests.post(
        f"{AUTH_URL}/login",
        json={
            "email": "admin@example.com",
            "password": "Admin@2024!"
        }
    )
    print_response(login_response, "Admin Login")
    
    if login_response.status_code == 403:
        # Admin must change password first
        must_change = login_response.json().get("must_change_password")
        if must_change:
            print("\n⚠️  Admin must change password on first login!")
            print("2. Forcing password change...")
            force_change_response = requests.post(
                f"{AUTH_URL}/force-password-change",
                json={
                    "email": "admin@example.com",
                    "current_password": "Admin@2024!",
                    "new_password": "NewAdminPassword123!"
                }
            )
            print_response(force_change_response, "Force Password Change")
            
            if force_change_response.status_code != 200:
                print("Failed to change password. Exiting.")
                return
            
            # Now login with new password
            print("\n3. Logging in with new password...")
            login_response = requests.post(
                f"{AUTH_URL}/login",
                json={
                    "email": "admin@example.com",
                    "password": "NewAdminPassword123!"
                }
            )
            print_response(login_response, "Admin Login (after password change)")
    
    if login_response.status_code != 200:
        print("Failed to login. Make sure the services are running and seeded.")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 4: Change admin credentials (optional - can also change email)
    print("\n4. Changing admin email (optional)...")
    change_email_response = requests.post(
        f"{ADMIN_URL}/change-credentials",
        headers=headers,
        json={
            "email": "admin@safebank.com"
        }
    )
    print_response(change_email_response, "Change Admin Email")
    
    # Step 5: Create a support agent
    print("\n5. Creating a support agent...")
    support_agent_response = requests.post(
        f"{ADMIN_URL}/users/create-support-agent",
        headers=headers,
        json={
            "email": "support@safebank.com",
            "full_name": "Support Agent",
            "phone": "1234567890",
            "password": "SupportPassword123!"
        }
    )
    print_response(support_agent_response, "Create Support Agent")
    
    # Step 6: Create an auditor
    print("\n6. Creating an auditor...")
    auditor_response = requests.post(
        f"{ADMIN_URL}/users/create-auditor",
        headers=headers,
        json={
            "email": "auditor@safebank.com",
            "full_name": "Auditor User",
            "phone": "0987654321",
            "password": "AuditorPassword123!"
        }
    )
    print_response(auditor_response, "Create Auditor")
    
    # Step 7: List all users
    print("\n7. Listing all users...")
    list_users_response = requests.get(
        f"{ADMIN_URL}/users/list",
        headers=headers
    )
    print_response(list_users_response, "List All Users")
    
    # Step 8: Edit a user's profile (make support agent inactive)
    if support_agent_response.status_code == 201:
        user_id = support_agent_response.json().get("user", {}).get("id")
        if user_id:
            print(f"\n8. Editing user profile (user_id={user_id})...")
            edit_response = requests.post(
                f"{ADMIN_URL}/users/edit",
                headers=headers,
                json={
                    "user_id": user_id,
                    "full_name": "Updated Support Agent Name",
                    "is_active": False
                }
            )
            print_response(edit_response, "Edit User Profile")
    
    # Step 9: Get specific user details
    if support_agent_response.status_code == 201:
        user_id = support_agent_response.json().get("user", {}).get("id")
        if user_id:
            print(f"\n9. Getting user details (user_id={user_id})...")
            user_details_response = requests.get(
                f"{ADMIN_URL}/users/{user_id}",
                headers=headers
            )
            print_response(user_details_response, "User Details")
    
    print("\n" + "="*60)
    print("Test completed!")
    print("="*60)

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\nError: Could not connect to services.")
        print("Make sure the services are running:")
        print("  cd backend && docker-compose up")
    except Exception as e:
        print(f"\nError: {e}")
