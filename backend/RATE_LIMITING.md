# Rate Limiting Configuration

## Overview
SafeBank implements rate limiting using Flask-Limiter to protect against:
- **Brute force attacks** on login/registration
- **Account enumeration** attempts
- **Transaction spam** and abuse
- **API overuse** and DoS attacks

## Implementation

### Default Limits

#### Auth Service
- **Global:** 200 requests per day, 50 per hour
- Applied to all endpoints by default

#### Accounts Service  
- **Global:** 500 requests per day, 100 per hour
- Applied to all endpoints by default

### Endpoint-Specific Limits

#### Authentication Endpoints

| Endpoint | Rate Limit | Reason |
|----------|-----------|--------|
| `POST /auth/register` | **5 per hour** | Prevent account spam |
| `POST /auth/login` | **5 per 15 minutes** | Prevent brute force attacks |
| `POST /auth/force-password-change` | **3 per hour** | Limit password reset attempts |
| `POST /auth/admin/change-username-password` | **10 per hour** | Admin credential changes |
| `POST /auth/admin/edit-user-profile` | **30 per hour** | Admin user management |

#### Transaction Endpoints

| Endpoint | Rate Limit | Reason |
|----------|-----------|--------|
| `POST /transactions/internal` | **20 per hour** | Prevent excessive internal transfers |
| `POST /transactions/external` | **10 per hour** | Higher risk - stricter limit |
| `POST /transactions/deposit` | **30 per hour** | Normal banking activity |
| `POST /transactions/withdraw` | **30 per hour** | Normal banking activity |
| `POST /transactions/topup` | **50 per hour** | Admin operations |

#### Account Endpoints

| Endpoint | Rate Limit | Reason |
|----------|-----------|--------|
| `POST /accounts/` | **10 per day** | Users shouldn't create many accounts |
| `POST /accounts/admin/create` | **50 per hour** | Admin bulk operations |

## How It Works

### Rate Limit Strategy
- **Algorithm:** Fixed-window counter
- **Key Function:** IP address (`get_remote_address`)
- **Storage:** In-memory (development) / Redis (production)

### Response Headers
When rate limiting is active, responses include:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1700000000
```

### Rate Limit Exceeded Response
```json
HTTP 429 Too Many Requests
{
  "error": "ratelimit exceeded",
  "message": "5 per 15 minutes"
}
```

## Production Deployment

### Using Redis for Rate Limiting

For production, configure Redis storage in `rate_limiter.py`:

```python
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    storage_uri="redis://redis:6379",  # Production Redis
    storage_options={"socket_connect_timeout": 30},
    strategy="fixed-window",
    headers_enabled=True,
)
```

### Docker Compose Configuration

Add Redis service to `docker-compose.yaml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    
  auth:
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
      
  accounts:
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379

volumes:
  redis_data:
```

## Advanced Configuration

### Per-User Rate Limiting

To rate limit by user ID instead of IP:

```python
def get_user_id():
    """Get user_id from JWT token for authenticated endpoints."""
    from flask import g
    return g.get("user", {}).get("user_id", get_remote_address())

limiter = Limiter(
    app=app,
    key_func=get_user_id,  # Use user ID
    ...
)
```

### Exempting Endpoints

To exempt specific endpoints from rate limiting:

```python
@bp.get("/health")
@limiter.exempt
def health_check():
    return {"status": "ok"}
```

### Custom Rate Limit Responses

```python
@limiter.request_filter
def filter_health_checks():
    """Exempt health check endpoints."""
    return request.path == "/health"

@app.errorhandler(429)
def ratelimit_handler(e):
    """Custom rate limit error response."""
    return jsonify({
        "error": "rate_limit_exceeded",
        "message": str(e.description),
        "retry_after": e.get_headers().get("Retry-After")
    }), 429
```

## Testing Rate Limits

### Manual Testing with curl

```bash
# Test login rate limit (5 per 15 minutes)
for i in {1..6}; do
  curl -X POST http://localhost:5001/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo "\nAttempt $i"
done
```

Expected: First 5 attempts return 401, 6th returns 429

### Automated Testing

```python
import requests
import time

def test_rate_limit():
    url = "http://localhost:5001/auth/login"
    data = {"email": "test@test.com", "password": "wrong"}
    
    # Make 6 requests
    for i in range(6):
        response = requests.post(url, json=data)
        print(f"Attempt {i+1}: Status {response.status_code}")
        
        if response.status_code == 429:
            print("✅ Rate limit working!")
            print(f"Headers: {response.headers}")
            break
    else:
        print("❌ Rate limit NOT working!")
```

## Monitoring

### Check Rate Limit Status

```python
from flask_limiter import Limiter

@bp.get("/admin/rate-limit-status")
@require_permission("admin")
def get_rate_limit_status():
    """Admin endpoint to view rate limit status."""
    limiter = current_app.limiter
    # Implementation depends on storage backend
    return {"status": "ok"}
```

### Logging Rate Limit Violations

```python
import logging
logger = logging.getLogger(__name__)

@app.errorhandler(429)
def ratelimit_handler(e):
    logger.warning(f"Rate limit exceeded: {request.remote_addr} - {request.path}")
    return jsonify({"error": "rate_limit_exceeded"}), 429
```

## Security Considerations

### Bypass Prevention
- Rate limiting by IP can be bypassed using proxies/VPNs
- Consider combining IP + User ID for authenticated endpoints
- Use CAPTCHA for critical endpoints after multiple failures

### Distributed Systems
- In-memory storage doesn't work across multiple servers
- Use Redis or Memcached for distributed deployments
- Consider using Redis Cluster for high availability

### Rate Limit Tuning
Current limits are conservative. Adjust based on:
- User behavior analytics
- System capacity
- Business requirements
- Attack patterns observed

## Troubleshooting

### Rate Limits Not Working
1. Check Flask-Limiter is installed: `pip show Flask-Limiter`
2. Verify limiter is initialized in `__init__.py`
3. Check decorator order (rate limit should be innermost)
4. Verify storage backend is accessible (Redis)

### False Positives
If legitimate users hit rate limits:
1. Increase limits for specific endpoints
2. Use per-user rate limiting for authenticated endpoints
3. Implement whitelist for trusted IPs
4. Add exponential backoff on client side

### Rate Limit Testing in Development
Use shorter time windows for testing:
```python
@bp.post("/test")
@current_app.limiter.limit("3 per minute")  # Easier to test
def test_endpoint():
    return {"ok": True}
```

## Next Steps

1. **Deploy with Redis** in production
2. **Monitor rate limit violations** in logs
3. **Tune limits** based on real usage patterns
4. **Add CAPTCHA** to login after rate limit
5. **Implement account lockout** after repeated failures
6. **Set up alerts** for excessive rate limit violations

---

## References

- Flask-Limiter Documentation: https://flask-limiter.readthedocs.io/
- OWASP Rate Limiting: https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
- Redis Rate Limiting Patterns: https://redis.io/docs/manual/patterns/rate-limiter/
