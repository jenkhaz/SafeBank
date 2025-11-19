# Rate Limiting - Postman Testing Guide

## Quick Test Overview

Rate limiting is now active on all critical endpoints. Here's how to test each one.

---

## 1. Test Login Rate Limit (5 per 15 minutes)

### Step 1: Create a new request in Postman

**Request:** POST `http://localhost:5001/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "test@test.com",
  "password": "wrongpassword"
}
```

### Step 2: Run 6 times quickly

**Method 1: Manual clicks**
- Click "Send" 6 times in quick succession

**Method 2: Using Collection Runner**
1. Save request to a collection
2. Click "Runner" 
3. Set iterations to 6
4. Click "Run"

### Expected Results:

**Attempts 1-5:** 
```json
HTTP 401 Unauthorized
{
  "msg": "Invalid credentials"
}
```

**Headers show:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4, 3, 2, 1, 0
X-RateLimit-Reset: 1700000000
```

**Attempt 6:**
```json
HTTP 429 Too Many Requests
{
  "error": "ratelimit exceeded",
  "message": "5 per 15 minutes"
}
```

---

## 2. Test Registration Rate Limit (5 per hour)

**Request:** POST `http://localhost:5001/auth/register`

**Body (JSON):**
```json
{
  "email": "test{{$randomInt}}@example.com",
  "full_name": "Test User",
  "password": "SecurePass123!",
  "phone": "1234567890"
}
```

**Note:** Use `{{$randomInt}}` in Postman to generate unique emails

### Test Steps:
1. Send request 6 times
2. First 5 should succeed (201) or fail validation (400)
3. 6th request should return **429 Too Many Requests**

---

## 3. Test Transaction Rate Limits

### A. External Transfer (10 per hour)

**Request:** POST `http://localhost:5002/transactions/external`

**Headers:**
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "sender_account_id": 1,
  "receiver_account_number": "ACCT-2-1",
  "amount": 10.00,
  "description": "Rate limit test"
}
```

**Test:** Send 11 times → 11th returns 429

---

### B. Internal Transfer (20 per hour)

**Request:** POST `http://localhost:5002/transactions/internal`

**Headers:**
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "sender_account_id": 1,
  "receiver_account_id": 2,
  "amount": 5.00,
  "description": "Rate limit test"
}
```

**Test:** Send 21 times → 21st returns 429

---

### C. Deposits (30 per hour)

**Request:** POST `http://localhost:5002/transactions/deposit`

**Headers:**
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "account_id": 1,
  "amount": 100.00,
  "description": "Rate limit test"
}
```

**Test:** Send 31 times → 31st returns 429

---

### D. Withdrawals (30 per hour)

**Request:** POST `http://localhost:5002/transactions/withdraw`

**Headers:**
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "account_id": 1,
  "amount": 10.00,
  "description": "Rate limit test"
}
```

**Test:** Send 31 times → 31st returns 429

---

## 4. Test Account Creation Rate Limit (10 per day)

**Request:** POST `http://localhost:5002/accounts/`

**Headers:**
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "type": "checking"
}
```

**Test:** Send 11 times → 11th returns 429

---

## 5. Test Admin Endpoints

### A. Admin Edit User (30 per hour)

**Request:** POST `http://localhost:5001/auth/admin/edit-user-profile`

**Headers:**
```
Authorization: Bearer {{admin_jwt_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "user_id": 2,
  "full_name": "Updated Name"
}
```

**Test:** Send 31 times → 31st returns 429

---

### B. Force Password Change (3 per hour)

**Request:** POST `http://localhost:5001/auth/force-password-change`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "admin@safebank.com",
  "current_password": "admin",
  "new_password": "NewSecure123!"
}
```

**Test:** Send 4 times → 4th returns 429

---

## Complete Postman Collection for Rate Limit Testing

Import this JSON into Postman:

```json
{
  "info": {
    "name": "SafeBank Rate Limiting Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "auth_url",
      "value": "http://localhost:5001"
    },
    {
      "key": "accounts_url",
      "value": "http://localhost:5002"
    },
    {
      "key": "jwt_token",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Rate Limit Tests",
      "item": [
        {
          "name": "1. Login Rate Limit Test (5 per 15min)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "// Check rate limit headers",
                  "pm.test('Rate limit headers present', function() {",
                  "    pm.response.to.have.header('X-RateLimit-Limit');",
                  "    pm.response.to.have.header('X-RateLimit-Remaining');",
                  "});",
                  "",
                  "// After 5 attempts, should get 429",
                  "if (pm.info.iteration >= 5) {",
                  "    pm.test('Rate limit exceeded returns 429', function() {",
                  "        pm.response.to.have.status(429);",
                  "    });",
                  "} else {",
                  "    pm.test('Within rate limit returns 401', function() {",
                  "        pm.response.to.have.status(401);",
                  "    });",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@test.com\",\n  \"password\": \"wrongpassword\"\n}"
            },
            "url": {
              "raw": "{{auth_url}}/auth/login",
              "host": ["{{auth_url}}"],
              "path": ["auth", "login"]
            }
          },
          "response": []
        },
        {
          "name": "2. Register Rate Limit Test (5 per hour)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "// After 5 attempts, should get 429",
                  "if (pm.info.iteration >= 5) {",
                  "    pm.test('Rate limit exceeded', function() {",
                  "        pm.response.to.have.status(429);",
                  "    });",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test{{$randomInt}}@example.com\",\n  \"full_name\": \"Test User\",\n  \"password\": \"SecurePass123!\",\n  \"phone\": \"1234567890\"\n}"
            },
            "url": {
              "raw": "{{auth_url}}/auth/register",
              "host": ["{{auth_url}}"],
              "path": ["auth", "register"]
            }
          },
          "response": []
        },
        {
          "name": "3. External Transfer Rate Limit (10 per hour)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.info.iteration >= 10) {",
                  "    pm.test('Rate limit exceeded at 11th attempt', function() {",
                  "        pm.response.to.have.status(429);",
                  "    });",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"sender_account_id\": 1,\n  \"receiver_account_number\": \"ACCT-2-1\",\n  \"amount\": 10.00,\n  \"description\": \"Rate limit test\"\n}"
            },
            "url": {
              "raw": "{{accounts_url}}/transactions/external",
              "host": ["{{accounts_url}}"],
              "path": ["transactions", "external"]
            }
          },
          "response": []
        },
        {
          "name": "4. Deposit Rate Limit (30 per hour)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.info.iteration >= 30) {",
                  "    pm.test('Rate limit exceeded at 31st attempt', function() {",
                  "        pm.response.to.have.status(429);",
                  "    });",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"account_id\": 1,\n  \"amount\": 1.00,\n  \"description\": \"Rate limit test\"\n}"
            },
            "url": {
              "raw": "{{accounts_url}}/transactions/deposit",
              "host": ["{{accounts_url}}"],
              "path": ["transactions", "deposit"]
            }
          },
          "response": []
        },
        {
          "name": "5. Account Creation Rate Limit (10 per day)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.info.iteration >= 10) {",
                  "    pm.test('Rate limit exceeded at 11th attempt', function() {",
                  "        pm.response.to.have.status(429);",
                  "    });",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"type\": \"checking\"\n}"
            },
            "url": {
              "raw": "{{accounts_url}}/accounts/",
              "host": ["{{accounts_url}}"],
              "path": ["accounts", ""]
            }
          },
          "response": []
        }
      ]
    },
    {
      "name": "Setup - Get JWT Token",
      "item": [
        {
          "name": "Login to Get Token",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 200) {",
                  "    var jsonData = pm.response.json();",
                  "    pm.collectionVariables.set('jwt_token', jsonData.access_token);",
                  "    console.log('JWT token saved');",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"customer@safebank.com\",\n  \"password\": \"password123\"\n}"
            },
            "url": {
              "raw": "{{auth_url}}/auth/login",
              "host": ["{{auth_url}}"],
              "path": ["auth", "login"]
            }
          },
          "response": []
        }
      ]
    }
  ]
}
```

---

## Using Collection Runner for Automated Testing

### Step-by-Step:

1. **Import Collection** 
   - Copy JSON above into new collection

2. **Get JWT Token First**
   - Run "Setup - Get JWT Token" → "Login to Get Token"
   - Token auto-saves to collection variable

3. **Run Rate Limit Test**
   - Select "1. Login Rate Limit Test"
   - Click **Run** button
   - Set **Iterations: 6**
   - Click **Run [Test Name]**

4. **View Results**
   - See all 6 requests in sequence
   - First 5: Status 401
   - Request 6: Status 429 ✅

### Visual Results:
```
Iteration 1: ✅ 401 (X-RateLimit-Remaining: 4)
Iteration 2: ✅ 401 (X-RateLimit-Remaining: 3)
Iteration 3: ✅ 401 (X-RateLimit-Remaining: 2)
Iteration 4: ✅ 401 (X-RateLimit-Remaining: 1)
Iteration 5: ✅ 401 (X-RateLimit-Remaining: 0)
Iteration 6: ✅ 429 (Rate Limit Exceeded!)
```

---

## Quick Manual Test (No Collection Needed)

### Test Login Rate Limit Right Now:

1. Open Postman
2. Create new POST request: `http://localhost:5001/auth/login`
3. Body (JSON):
   ```json
   {
     "email": "fake@test.com",
     "password": "wrong"
   }
   ```
4. Click **Send** 6 times rapidly
5. Watch response codes: 401, 401, 401, 401, 401, **429**

---

## Checking Rate Limit Headers

Every response includes:

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1700483145
```

**Meaning:**
- **Limit:** Total requests allowed in time window
- **Remaining:** Requests left before hitting limit
- **Reset:** Unix timestamp when limit resets

---

## Reset Rate Limits (For Testing)

Rate limits reset automatically after the time window, but for immediate reset:

### Option 1: Restart Services
```bash
docker-compose restart auth accounts
```

### Option 2: Wait for Time Window
- Login: Wait 15 minutes
- Register: Wait 1 hour
- Deposits: Wait 1 hour
- Transfers: Wait 1 hour

### Option 3: Use Different IP (Advanced)
- Rate limits are per-IP address
- Use VPN or proxy to test from different IP

---

## Expected 429 Response

```json
{
  "error": "ratelimit exceeded",
  "message": "5 per 15 minutes"
}
```

**Headers:**
```
Retry-After: 900
X-RateLimit-Reset: 1700483145
```

---

## Summary Table

| Endpoint | Rate Limit | Test Iterations | Expected 429 |
|----------|-----------|-----------------|--------------|
| Login | 5 per 15 min | 6 | 6th request |
| Register | 5 per hour | 6 | 6th request |
| External Transfer | 10 per hour | 11 | 11th request |
| Internal Transfer | 20 per hour | 21 | 21st request |
| Deposit | 30 per hour | 31 | 31st request |
| Withdraw | 30 per hour | 31 | 31st request |
| Create Account | 10 per day | 11 | 11th request |
| Admin Edit User | 30 per hour | 31 | 31st request |
| Force Password Change | 3 per hour | 4 | 4th request |

---

## Troubleshooting

### Rate Limit Not Working?
1. Check services are running: `docker ps`
2. Rebuild services: `docker-compose up --build -d auth accounts`
3. Check logs: `docker-compose logs auth`

### Still Getting Through After Limit?
- Rate limits are per IP address
- Check if you're testing from multiple IPs
- Verify Flask-Limiter is installed: Check requirements.txt

### Want to Change Limits?
Edit `extensions.py`:
```python
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000 per day", "200 per hour"],  # Increase here
    ...
)
```

---

## Production Recommendations

For production, use Redis for distributed rate limiting:

```python
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://redis:6379",  # Production
    ...
)
```

This ensures rate limits work across multiple server instances.
