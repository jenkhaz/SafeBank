# SafeBank Banking Operations Guide

Complete guide to all banking operations available in SafeBank.

## Account Operations

### Create Account
```http
POST /accounts/
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "checking"  // or "savings"
}
```

**Response:**
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

### List My Accounts
```http
GET /accounts/
Authorization: Bearer {token}
```

---

## Transaction Operations

### 1. Deposit Money
**Endpoint:** `POST /transactions/deposit`

**Use Case:** Customer deposits money into their own account (ATM, bank teller, check deposit, etc.)

```http
POST /transactions/deposit
Authorization: Bearer {token}
Content-Type: application/json

{
  "account_id": 1,
  "amount": 500.00,
  "description": "Initial deposit"
}
```

**Response:**
```json
{
  "msg": "Deposit successful",
  "account": {
    "id": 1,
    "balance": 500.0,
    ...
  },
  "transaction": {
    "id": 1,
    "type": "deposit",
    "amount": 500.0,
    ...
  },
  "previous_balance": 0.0,
  "new_balance": 500.0
}
```

**Validations:**
- ✅ Amount must be positive
- ✅ Account must belong to user
- ✅ Account must be Active

---

### 2. Withdraw Money
**Endpoint:** `POST /transactions/withdraw`

**Use Case:** Customer withdraws cash from their account (ATM, bank teller, etc.)

```http
POST /transactions/withdraw
Authorization: Bearer {token}
Content-Type: application/json

{
  "account_id": 1,
  "amount": 100.00,
  "description": "ATM withdrawal"
}
```

**Response:**
```json
{
  "msg": "Withdrawal successful",
  "account": {
    "id": 1,
    "balance": 400.0,
    ...
  },
  "transaction": {
    "id": 2,
    "type": "withdrawal",
    "amount": 100.0,
    ...
  },
  "previous_balance": 500.0,
  "new_balance": 400.0
}
```

**Validations:**
- ✅ Amount must be positive
- ✅ Account must belong to user
- ✅ Account must be Active
- ✅ Sufficient balance required

---

### 3. Internal Transfer
**Endpoint:** `POST /transactions/internal`

**Use Case:** Transfer money between customer's own accounts (e.g., checking → savings)

```http
POST /transactions/internal
Authorization: Bearer {token}
Content-Type: application/json

{
  "sender_account_id": 1,
  "receiver_account_id": 2,
  "amount": 300.00,
  "description": "Transfer to savings"
}
```

**Response:**
```json
{
  "id": 3,
  "sender_account_id": 1,
  "receiver_account_id": 2,
  "amount": 300.0,
  "type": "internal",
  "timestamp": "2025-11-19T10:30:00",
  "description": "Transfer to savings"
}
```

**Validations:**
- ✅ Amount must be positive
- ✅ Both accounts must belong to user
- ✅ Both accounts must be Active
- ✅ Sufficient balance in sender account

---

### 4. External Transfer
**Endpoint:** `POST /transactions/external`

**Use Case:** Transfer money to another customer's account (bill payment, send money to friend, etc.)

```http
POST /transactions/external
Authorization: Bearer {token}
Content-Type: application/json

{
  "sender_account_id": 1,
  "receiver_account_number": "ACCT-6-1",
  "amount": 50.00,
  "description": "Payment to Jane"
}
```

**Response:**
```json
{
  "id": 4,
  "sender_account_id": 1,
  "receiver_account_id": 3,
  "amount": 50.0,
  "type": "external",
  "timestamp": "2025-11-19T11:00:00",
  "description": "Payment to Jane"
}
```

**Validations:**
- ✅ Amount must be positive
- ✅ Sender account must belong to user
- ✅ Receiver account must exist (by account_number)
- ✅ Both accounts must be Active
- ✅ Sufficient balance in sender account

---

## Transaction History

### View All Transactions
```http
GET /transactions/
Authorization: Bearer {token}
```

### Filter Transactions

**By Date Range:**
```http
GET /transactions/?start_date=2025-01-01&end_date=2025-12-31
```

**By Transaction Type:**
```http
GET /transactions/?type=external
```
Valid types: `internal`, `external`, `deposit`, `withdrawal`

**By Amount Range:**
```http
GET /transactions/?min_amount=100&max_amount=500
```

**Combined Filters:**
```http
GET /transactions/?start_date=2025-01-01&type=deposit&min_amount=100
```

### Export to PDF
```http
GET /transactions/export-pdf
Authorization: Bearer {token}
```

**With Filters:**
```http
GET /transactions/export-pdf?start_date=2025-01-01&type=external&min_amount=100
```

**Response:** Downloads PDF file with transaction history

---

## Transaction Types Summary

| Type | Description | Sender | Receiver | Use Case |
|------|-------------|--------|----------|----------|
| **deposit** | Add money to account | Same account | Same account | ATM deposit, check deposit |
| **withdrawal** | Remove money from account | Same account | Same account | ATM withdrawal, cash out |
| **internal** | Transfer between own accounts | User's account | User's account | Checking → Savings |
| **external** | Transfer to another user | User's account | Other user's account | Bill payment, send money |

---

## Admin/Support Operations

### Top-up Any Account
**Endpoint:** `POST /transactions/topup` (Admin/Support only)

Used by bank staff to add money to any customer account (corrections, refunds, etc.)

```http
POST /transactions/topup
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "account_id": 5,
  "amount": 1000.00
}
```

---

## Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "msg": "Unauthorized"
}
```

**400 Bad Request:**
```json
{
  "msg": "amount must be positive"
}
```

**400 Insufficient Funds:**
```json
{
  "msg": "Insufficient funds"
}
```

**404 Not Found:**
```json
{
  "msg": "Account not found or does not belong to you"
}
```

**400 Invalid Account Status:**
```json
{
  "msg": "Account is Frozen. Cannot deposit to inactive account."
}
```

---

## Permissions Required

| Operation | Permission |
|-----------|-----------|
| Create Account | `accounts:create:own` |
| View Accounts | `accounts:view:own` |
| Deposit | `accounts:topup` |
| Withdraw | `accounts:topup` |
| Internal Transfer | `transfer:internal` |
| External Transfer | `transfer:external` |
| View Transactions | `transactions:view:own` |
| Export PDF | `transactions:view:own` |

**Note:** All customer accounts have these permissions by default.

---

## Best Practices

1. **Always check balance** before allowing withdrawals/transfers
2. **Validate account ownership** for deposit/withdraw operations
3. **Record all transactions** with timestamps and descriptions
4. **Use descriptive messages** in transaction descriptions
5. **Handle errors gracefully** with clear error messages
6. **Check account status** before any operation
7. **Use filters** to find specific transactions efficiently

---

## Security Features

✅ JWT authentication required for all operations  
✅ Users can only access their own accounts  
✅ Account ownership validation on all operations  
✅ Balance validation prevents overdrafts  
✅ Account status checks (Active/Frozen/Closed)  
✅ All transactions logged with timestamps  
✅ Audit trail for all banking operations  

---

## Example User Flow

```python
# 1. Customer logs in
POST /auth/login → gets JWT token

# 2. Create checking account
POST /accounts/ → account_id: 1

# 3. Deposit initial amount
POST /transactions/deposit → balance: $500

# 4. Create savings account
POST /accounts/ → account_id: 2

# 5. Transfer to savings
POST /transactions/internal → checking: $200, savings: $300

# 6. Pay external bill
POST /transactions/external → checking: $150

# 7. View transaction history
GET /transactions/?type=external

# 8. Export for records
GET /transactions/export-pdf → download PDF
```

---

## Testing

Run comprehensive tests:
```bash
cd backend
python test_accounts_service.py
```

This tests:
- Account creation
- Deposits
- Withdrawals
- Internal transfers
- External transfers (if multiple users)
- Transaction filtering
- PDF export
- Error handling
