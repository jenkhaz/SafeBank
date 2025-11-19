#!/usr/bin/env python3
"""
Test script for Accounts Service functionality
Tests account creation, transactions, and balance management
"""

import requests
import json

# Service URLs
AUTH_URL = "http://localhost:5001/auth"
ACCOUNTS_URL = "http://localhost:5002/accounts"
TRANSACTIONS_URL = "http://localhost:5002/transactions"

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
    print("SafeBank Accounts Service Test Script")
    print("="*60)
    
    # Step 1: Register and login as a customer
    print("\n1. Registering a new customer...")
    register_response = requests.post(
        f"{AUTH_URL}/register",
        json={
            "email": "customer@example.com",
            "password": "CustomerPass123!",
            "full_name": "John Customer",
            "phone": "5555555555"
        }
    )
    print_response(register_response, "Customer Registration")
    
    if register_response.status_code == 400 and "already exists" in register_response.text:
        print("Note: Customer already exists, continuing with login...")
    
    print("\n2. Logging in as customer...")
    login_response = requests.post(
        f"{AUTH_URL}/login",
        json={
            "email": "customer@example.com",
            "password": "CustomerPass123!"
        }
    )
    print_response(login_response, "Customer Login")
    
    if login_response.status_code != 200:
        print("Login failed. Cannot continue tests.")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 3: Create a checking account
    print("\n3. Creating a checking account...")
    checking_account_response = requests.post(
        f"{ACCOUNTS_URL}/",
        headers=headers,
        json={
            "type": "checking"
        }
    )
    print_response(checking_account_response, "Create Checking Account")
    
    if checking_account_response.status_code != 201:
        print("Failed to create checking account. Cannot continue tests.")
        return
    
    checking_account_id = checking_account_response.json()["id"]
    
    # Step 4: Create a savings account
    print("\n4. Creating a savings account...")
    savings_account_response = requests.post(
        f"{ACCOUNTS_URL}/",
        headers=headers,
        json={
            "type": "savings"
        }
    )
    print_response(savings_account_response, "Create Savings Account")
    
    savings_account_id = None
    if savings_account_response.status_code == 201:
        savings_account_id = savings_account_response.json()["id"]
    
    # Step 5: List all accounts
    print("\n5. Listing all customer accounts...")
    list_accounts_response = requests.get(
        f"{ACCOUNTS_URL}/",
        headers=headers
    )
    print_response(list_accounts_response, "List Accounts")
    
    # Step 6: Deposit money into checking account
    print(f"\n6. Depositing $500 into checking account...")
    deposit_response = requests.post(
        f"{TRANSACTIONS_URL}/deposit",
        headers=headers,
        json={
            "account_id": checking_account_id,
            "amount": 500.00,
            "description": "Initial deposit"
        }
    )
    print_response(deposit_response, "Deposit Transaction")
    
    # Step 6a: Withdraw money from checking account
    print(f"\n6a. Withdrawing $100 from checking account...")
    withdrawal_response = requests.post(
        f"{TRANSACTIONS_URL}/withdraw",
        headers=headers,
        json={
            "account_id": checking_account_id,
            "amount": 100.00,
            "description": "ATM withdrawal"
        }
    )
    print_response(withdrawal_response, "Withdrawal Transaction")
    
    # Step 6b: Transfer between accounts (if savings account exists)
    if savings_account_id:
        print(f"\n6. Transferring $300 from checking to savings...")
        transfer_response = requests.post(
            f"{TRANSACTIONS_URL}/internal",
            headers=headers,
            json={
                "sender_account_id": checking_account_id,
                "receiver_account_id": savings_account_id,
                "amount": 300.00,
                "description": "Test internal transfer"
            }
        )
        print_response(transfer_response, "Internal Transfer Transaction")
    
    # Step 7: Get transaction history
    print(f"\n7. Getting transaction history...")
    transactions_response = requests.get(
        f"{TRANSACTIONS_URL}/",
        headers=headers
    )
    print_response(transactions_response, "Transaction History")
    
    # Step 7a: Filter transactions by type
    print(f"\n7a. Filtering transactions by type (internal)...")
    filtered_type_response = requests.get(
        f"{TRANSACTIONS_URL}/",
        headers=headers,
        params={"type": "internal"}
    )
    print_response(filtered_type_response, "Filtered by Type")
    
    # Step 7b: Filter transactions by amount range
    print(f"\n7b. Filtering transactions by amount range (200-400)...")
    filtered_amount_response = requests.get(
        f"{TRANSACTIONS_URL}/",
        headers=headers,
        params={"min_amount": 200, "max_amount": 400}
    )
    print_response(filtered_amount_response, "Filtered by Amount Range")
    
    # Step 7c: Export transactions to PDF
    print(f"\n7c. Exporting transactions to PDF...")
    pdf_response = requests.get(
        f"{TRANSACTIONS_URL}/export-pdf",
        headers=headers
    )
    if pdf_response.status_code == 200:
        print(f"\n{'='*60}")
        print("PDF Export")
        print(f"{'='*60}")
        print(f"Status Code: {pdf_response.status_code}")
        print(f"Content-Type: {pdf_response.headers.get('Content-Type')}")
        print(f"Content-Length: {len(pdf_response.content)} bytes")
        # Optionally save to file
        with open("test_transactions_export.pdf", "wb") as f:
            f.write(pdf_response.content)
        print("✅ PDF saved to: test_transactions_export.pdf")
    else:
        print_response(pdf_response, "PDF Export (failed)")
    
    # Step 8: Test invalid transfer (negative amount)
    print(f"\n8. Testing negative amount transfer (should fail)...")
    negative_response = requests.post(
        f"{TRANSACTIONS_URL}/internal",
        headers=headers,
        json={
            "sender_account_id": checking_account_id,
            "receiver_account_id": savings_account_id,
            "amount": -100.00,
            "description": "Negative test"
        }
    )
    print_response(negative_response, "Negative Amount Test (should fail)")
    
    # Step 9: Test insufficient funds
    if savings_account_id:
        print(f"\n9. Testing insufficient funds (should fail)...")
        overdraft_response = requests.post(
            f"{TRANSACTIONS_URL}/internal",
            headers=headers,
            json={
                "sender_account_id": checking_account_id,
                "receiver_account_id": savings_account_id,
                "amount": 99999.00,
                "description": "Overdraft test"
            }
        )
        print_response(overdraft_response, "Insufficient Funds Test (should fail)")
    
    print("\n" + "="*60)
    print("✅ Accounts Service Test completed!")
    print("="*60)
    print("\nSummary:")
    print("- Account creation (checking & savings)")
    print("- Deposits and withdrawals")
    print("- Internal transfers between accounts")
    print("- Transaction history with filtering")
    print("- PDF export")
    print("- Input validation (negative amounts, insufficient funds)")
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
        import traceback
        traceback.print_exc()
