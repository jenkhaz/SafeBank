# SafeBank Postman Collection Guide

## Quick Start

### 1. Import Collection
1. Open Postman
2. Click **Import** button (top left)
3. Select `SafeBank_Postman_Collection.json`
4. Collection will appear with all pre-configured requests

### 2. Complete Workflow (In Order)

#### Step 1: Register New User
📍 **1. Authentication → Register New User**

Request automatically saves JWT token to collection variables.

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response Example:**
```json
{
  "msg": "User registered successfully",
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 5,
    "username": "john_doe",
    "role": "Customer"
  }
}
```

✅ JWT token automatically saved!

---

#### Step 2: Create Checking Account
📍 **2. Account Management → Create Checking Account**

Request automatically saves account ID as `account_id_1`.

```json
{
  "type": "checking"
}
```

**Response Example:**
```json
{
  "id": 1,
  "account_number": "ACCT-5-1",
  "user_id": 5,
  "type": "checking",
  "balance": 0.0,
  "status": "Active"
}
```

✅ Account ID saved as `account_id_1`!

---

#### Step 3: Create Savings Account (Optional)
📍 **2. Account Management → Create Savings Account**

Request automatically saves account ID as `account_id_2` and account number as `account_number_2`.

```json
{
  "type": "savings"
}
```

**Response Example:**
```json
{
  "id": 2,
  "account_number": "ACCT-5-2",
  "user_id": 5,
  "type": "savings",
  "balance": 0.0,
  "status": "Active"
}
```

✅ Account ID saved as `account_id_2`!

---

#### Step 4: Deposit Money
📍 **3. Transactions → Deposit Money**

Automatically uses saved `account_id_1` from Step 2.

```json
{
  "account_id": 1,  // Uses {{account_id_1}} variable
  "amount": 1000.00,
  "description": "Initial deposit"
}
```

**Response Example:**
```json
{
  "msg": "Deposit successful",
  "account": {
    "id": 1,
    "balance": 1000.0
  },
  "transaction": {
    "id": 1,
    "type": "deposit",
    "amount": 1000.0,
    "timestamp": "2025-11-19T10:00:00"
  },
  "previous_balance": 0.0,
  "new_balance": 1000.0
}
```

---

#### Step 5: Withdraw Money
📍 **3. Transactions → Withdraw Money**

```json
{
  "account_id": 1,  // Uses {{account_id_1}} variable
  "amount": 200.00,
  "description": "ATM withdrawal"
}
```

**Response Example:**
```json
{
  "msg": "Withdrawal successful",
  "previous_balance": 1000.0,
  "new_balance": 800.0
}
```

---

#### Step 6: Internal Transfer
📍 **3. Transactions → Internal Transfer (Between Own Accounts)**

Transfer from checking to savings. Automatically uses saved account IDs.

```json
{
  "sender_account_id": 1,    // {{account_id_1}} - checking
  "receiver_account_id": 2,  // {{account_id_2}} - savings
  "amount": 300.00,
  "description": "Transfer to savings"
}
```

**Response Example:**
```json
{
  "id": 3,
  "sender_account_id": 1,
  "receiver_account_id": 2,
  "amount": 300.0,
  "type": "internal",
  "timestamp": "2025-11-19T10:30:00"
}
```

---

#### Step 7: External Transfer (To Another User)
📍 **3. Transactions → External Transfer (To Another User)**

**⚠️ Important:** You need another user's account number. Options:
1. Create a second user and get their account number
2. Use an existing account number (e.g., `ACCT-2-1`)

```json
{
  "sender_account_id": 1,  // {{account_id_1}}
  "receiver_account_number": "ACCT-2-1",  // Change this!
  "amount": 50.00,
  "description": "Payment to friend"
}
```

**Note:** Change `ACCT-2-1` to an actual recipient account number.

---

#### Step 8: View Transaction History
📍 **4. Transaction History → Get All Transactions**

```
GET http://localhost:5002/transactions/
```

**Response Example:**
```json
[
  {
    "id": 1,
    "type": "deposit",
    "amount": 1000.0,
    "timestamp": "2025-11-19T10:00:00",
    "description": "Initial deposit"
  },
  {
    "id": 2,
    "type": "withdrawal",
    "amount": 200.0,
    "timestamp": "2025-11-19T10:15:00"
  },
  {
    "id": 3,
    "type": "internal",
    "amount": 300.0,
    "timestamp": "2025-11-19T10:30:00"
  }
]
```

---

## Advanced Features

### Transaction Filtering

#### Filter by Date Range
```
GET /transactions/?start_date=2025-11-01&end_date=2025-11-30
```

#### Filter by Type
```
GET /transactions/?type=deposit
```
Valid types: `deposit`, `withdrawal`, `internal`, `external`

#### Filter by Amount
```
GET /transactions/?min_amount=100&max_amount=500
```

#### Combined Filters
```
GET /transactions/?start_date=2025-11-01&type=external&min_amount=50
```

### Export to PDF
📍 **4. Transaction History → Export to PDF**

Downloads PDF file with transaction history. Supports all filters:
```
GET /transactions/export-pdf?type=deposit&min_amount=100
```

---

## Collection Variables (Automatic)

These are automatically saved by the requests:

| Variable | Saved By | Description |
|----------|----------|-------------|
| `jwt_token` | Register/Login | Authentication token |
| `account_id_1` | Create Checking | First account ID |
| `account_id_2` | Create Savings | Second account ID |
| `account_number_2` | Create Savings | Second account number |

**To view variables:**
1. Click on collection name
2. Click **Variables** tab
3. See current values

---

## Manual Variable Editing (If Needed)

If automatic saving doesn't work:

1. Run the request
2. Copy the value from response
3. Click collection name → **Variables** tab
4. Paste value in **CURRENT VALUE** column
5. Click **Save**

---

## Tips for Testing External Transfers

### Option 1: Create Second User
1. Use **Register New User** request
2. Change username/email (e.g., "jane_doe")
3. Login with new user
4. Create account for new user
5. Copy account number from response
6. Login back as first user
7. Use copied account number in external transfer

### Option 2: Use Test Account Numbers
Check if these exist in your database:
- `ACCT-1-1` (Admin's account)
- `ACCT-2-1`, `ACCT-3-1` (Other test accounts)

---

## Error Handling

### Common Errors

**401 Unauthorized**
- Token expired or invalid
- Solution: Login again (Step 1)

**400 Insufficient Funds**
```json
{
  "msg": "Insufficient funds"
}
```
- Solution: Deposit more money

**404 Account Not Found**
```json
{
  "msg": "Account not found or does not belong to you"
}
```
- Solution: Check account_id is correct and belongs to you

**400 Invalid Account Number**
```json
{
  "msg": "Receiver account not found"
}
```
- Solution: Use valid recipient account number

---

## Expected Balances After Full Workflow

Starting with $1000 deposit:

| Operation | Checking Balance | Savings Balance |
|-----------|-----------------|-----------------|
| Deposit $1000 | $1000 | $0 |
| Withdraw $200 | $800 | $0 |
| Transfer $300 to savings | $500 | $300 |
| External transfer $50 | $450 | $300 |

---

## Quick Testing Checklist

- [ ] Register new user (JWT saved automatically)
- [ ] Create checking account (ID saved)
- [ ] Create savings account (ID saved)
- [ ] Deposit $1000 (balance: $1000)
- [ ] Withdraw $200 (balance: $800)
- [ ] Internal transfer $300 (checking: $500, savings: $300)
- [ ] External transfer $50 (need recipient account)
- [ ] View all transactions (should see 4+ entries)
- [ ] Filter by type=deposit
- [ ] Export to PDF

---

## Ports Configuration

Default ports in collection:
- **Auth Service:** 5001
- **Accounts Service:** 5002

To change:
1. Click collection → **Variables** tab
2. Modify `auth_port` or `accounts_port`
3. Save

---

## Authentication Notes

- JWT token is automatically included in all requests after login
- Token stored in collection variable `{{jwt_token}}`
- All requests use Bearer token authentication
- Token format: `Authorization: Bearer {{jwt_token}}`

---

## Next Steps After Import

1. **Start Services:**
   ```bash
   cd backend
   docker-compose up
   ```

2. **Import Collection:**
   - Postman → Import → Select JSON file

3. **Run Requests in Order:**
   - Follow Steps 1-8 above
   - Watch for automatic variable saving

4. **Explore Filters:**
   - Try different filter combinations
   - Export filtered results to PDF

5. **Test External Transfers:**
   - Create second user OR use existing account numbers

---

## Support

If you encounter issues:
1. Check services are running: `docker ps`
2. Verify ports 5001 and 5002 are accessible
3. Check collection variables are saved
4. Review response error messages
5. Confirm account IDs match your accounts

Enjoy testing SafeBank! 🏦
