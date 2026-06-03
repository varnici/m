# Architecture & Security Documentation

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Native Mobile App                      │
│          (Expo - iOS, Android, Web compatible)                  │
├─────────────────────────────────────────────────────────────────┤
│                   ┌───────────────────┐                          │
│                   │  InventoryForm    │  Voice Input             │
│                   │  + AudioRecorder  │  BarcodeScanner          │
│                   │  + BarcodeScanner │                          │
│                   └───────────────────┘                          │
│                           ↓                                       │
│                   ┌───────────────────┐                          │
│                   │  inventoryApi.ts  │  API Client              │
│                   │  (fetch calls)    │                          │
│                   └───────────────────┘                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTP/HTTPS
                      │ (REST API)
┌─────────────────────▼───────────────────────────────────────────┐
│              FastAPI Backend (Python)                            │
│                 (Uvicorn ASGI Server)                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Middleware Stack                           │   │
│  │  - CORS (cross-origin requests)                        │   │
│  │  - Rate Limiting (slowapi)                             │   │
│  │  - Security Headers (HSTS, X-Frame-Options, etc)      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Routers & Endpoints                       │    │
│  │  - inventory.py (CRUD: POST, GET, PATCH, DELETE)    │    │
│  │  - voice.py (Transcription: POST /voice/transcribe)  │    │
│  └────────────────────────────────────────────────────────┘    │
│           ↓                                    ↓                 │
│  ┌─────────────────────────┐      ┌──────────────────────┐    │
│  │ inventory_service.py    │      │ voice_service.py     │    │
│  │ (Business Logic)        │      │ (Moonshine ASR)      │    │
│  │ - CRUD operations       │      │ - Transcribe audio   │    │
│  │ - Validation            │      │ - Extract numbers    │    │
│  └─────────────────────────┘      └──────────────────────┘    │
│           ↓                                    ↓                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         supabase_service.py (DB Client)               │   │
│  │         @lru_cache singleton initialization           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ PostgreSQL Driver
                      │ (Supabase SDK)
┌─────────────────────▼───────────────────────────────────────────┐
│            Supabase PostgreSQL Database                          │
│                    (Cloud Hosted)                               │
├─────────────────────────────────────────────────────────────────┤
│  Tables:                                                         │
│  - inventory (product_name, quantity, sold, price, etc)       │
│  - [Row-Level Security enabled]                               │
│                                                                 │
│  Generated Columns:                                            │
│  - profit = (price - product_cost) * sold                     │
│  - revenue = price * sold                                      │
│                                                                 │
│  Views:                                                        │
│  - inventory_summary (totals, margin %)                       │
│                                                                 │
│  Indexes:                                                      │
│  - idx_inventory_created_at                                   │
│  - idx_inventory_product_name                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow - Voice Input Example

```
1. User taps "Record" button
   ↓
2. AudioRecorder requests permissions (expo-av)
   ↓
3. Device captures audio → Blob
   ↓
4. Blob sent to backend POST /voice/transcribe
   ↓
5. Backend receives multipart/form-data file
   ↓
6. voice_service.transcribe_bytes() processes:
   - Write audio to temp file
   - Load with soundfile
   - Run Moonshine ONNX model
   - Extract text
   ↓
7. extract_number() converts "one hundred" → "100"
   ↓
8. Backend returns: {text, extracted_number, field_type}
   ↓
9. Frontend displays transcription
   ↓
10. User confirms → Form value updated
    ↓
11. User submits form
    ↓
12. Frontend POST /inventory/ with all fields
    ↓
13. Backend validates (sold ≤ quantity)
    ↓
14. Supabase INSERT:
    - profit = calculated by GENERATED column
    - revenue = calculated by GENERATED column
    ↓
15. User sees success message + inventory updated
```

---

## Technology Stack

### Frontend
| Component | Version | Purpose |
|-----------|---------|---------|
| React Native | 0.81.5 | Cross-platform mobile UI |
| Expo | 54 | Development & deployment |
| TypeScript | 5.x | Type safety |
| React Hook Form | - | Form state & validation |
| expo-av | - | Audio recording |
| expo-camera | - | Barcode scanning |
| nativewind | - | TailwindCSS on mobile |

### Backend
| Component | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.115.0 | REST API framework |
| Uvicorn | 0.30.6 | ASGI server |
| Pydantic | 2.9.2 | Data validation |
| Supabase SDK | 2.7.4 | Database client |
| Moonshine ONNX | 0.1.0 | Offline ASR |
| slowapi | 0.1.9 | Rate limiting |
| soundfile | 0.12.1 | Audio processing |

### Database
| Component | Purpose |
|-----------|---------|
| PostgreSQL | Database engine (via Supabase) |
| Row-Level Security | Authentication & authorization |
| Generated Columns | Automatic profit/revenue calculation |
| Indexes | Query performance |

---

## Security Architecture

### 1. Authentication & Authorization

#### Frontend
- **No authentication required for MVP** (assumes private network)
- Future: Add JWT tokens from Supabase auth
- Store tokens in secure storage (Expo SecureStore)

#### Backend
- **Supabase Service Key** for server-to-database communication
- Never expose service key to frontend
- Use Supabase Row-Level Security for data access control

#### Database
- **Supabase Row-Level Security (RLS)** enables:
  - Users see only their own inventory
  - Customers can't access other customers' data
  - Admins have full access

### 2. Network Security

#### CORS (Cross-Origin Resource Sharing)
```python
# Whitelist only trusted origins
ALLOWED_ORIGINS = [
    "http://localhost:8081",      # Local dev
    "http://localhost:3000",      # Web dev
    "http://192.168.1.175:8000",  # LAN development
    "https://app.example.com",    # Production (future)
]
```

#### HTTPS (Production)
- All production endpoints MUST use HTTPS
- Certificate via Let's Encrypt or AWS ACM
- HTTP redirects to HTTPS

#### Rate Limiting
```
Global:   200 requests/minute
Inventory endpoints:
  - POST /inventory/: 60/min (create)
  - GET /inventory/: 120/min (list)
  - PATCH /inventory/{id}: 60/min (update)
  - DELETE /inventory/{id}: 30/min (delete)
Voice endpoints:
  - POST /voice/transcribe: 30/min (resource-intensive)
```

### 3. Data Validation

#### Input Validation (Frontend)
```typescript
// React Hook Form + Zod
- product_name: required, 1-255 chars
- customer_id: required, alphanumeric
- quantity: ≥ 0, integer
- sold: ≥ 0, integer, ≤ quantity
- prices: ≥ 0, 2 decimal places
```

#### Input Validation (Backend)
```python
# Pydantic v2
- All fields re-validated server-side
- Cross-field validation: sold ≤ quantity
- Decimal precision: 18,2 (prevents floating point errors)
- String length limits enforced
```

### 4. HTTP Security Headers

```
X-Content-Type-Options: nosniff
  → Prevents MIME type sniffing attacks

X-Frame-Options: DENY
  → Prevents clickjacking (app can't be framed)

Strict-Transport-Security: max-age=63072000
  → Forces HTTPS for 2 years

Referrer-Policy: no-referrer
  → Doesn't leak referrer information

Cache-Control: no-store (production only)
  → Prevents sensitive data in cache
```

### 5. Secret Management

#### Environment Variables
```env
# Never commit to git
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_KEY=...       # Keep secret!
API_SECRET_KEY=...              # Keep secret!
ALLOWED_ORIGINS=...
```

#### Best Practices
- Use `.env` files locally only
- Use secrets management in production (AWS Secrets Manager, GitHub Secrets)
- Rotate keys regularly
- Different keys for development/staging/production
- Never log secrets

### 6. Database Security

#### Supabase Configuration
- **Row-Level Security (RLS):** Enabled on all tables
- **Service Key:** Only used server-side for administrative operations
- **Anon Key:** For client-side reads (if needed in future)

#### Column-Level Security
- All sensitive fields accessible only to authorized users
- Profit/revenue calculated server-side (can't be manipulated)
- Timestamps auto-managed by database

#### SQL Injection Prevention
- Supabase SDK handles parameterization
- No raw SQL strings concatenated
- All input validated before database operations

### 7. Audio Security

#### Voice Data Handling
- Audio files processed in-memory when possible
- Temp files securely deleted after processing
- No audio stored on server (stateless)
- Transcribed text sent to frontend (not audio)
- No recording of transcription results (privacy-first)

#### Moonshine Security
- ONNX model runs locally (offline-capable)
- No audio sent to cloud services
- No API keys for ASR (self-hosted)
- Model integrity verified on download

### 8. Error Handling

#### Frontend
- User-friendly error messages
- Don't expose stack traces to user
- Log errors for debugging

#### Backend
```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    # Log details for debugging
    logger.warning(f"Validation error: {exc}")
    # Return minimal info to client
    return JSONResponse({
        "detail": "Invalid request data",
        "errors": exc.errors()
    })
```

---

## Performance Optimization

### Backend Optimizations
1. **Database Indexes** on frequently queried columns (created_at, product_name)
2. **Generated Columns** avoid repeated profit/revenue calculations
3. **Pagination** (limit/offset) prevents loading large datasets
4. **Model Caching** (@lru_cache) keeps Moonshine in memory
5. **Async I/O** with Uvicorn for concurrent requests

### Frontend Optimizations
1. **useCallback** for all event handlers (prevents re-renders)
2. **useMemo** for expensive computations
3. **Pagination** on inventory list
4. **Lazy loading** of screens (React Navigation)
5. **Code splitting** via Expo bundler

### Voice Service Optimizations
1. **Moonshine ONNX** (fast, offline)
2. **Async audio processing** (doesn't block other requests)
3. **Temp files** deleted immediately after use
4. **Input validation** rejects invalid audio early

---

## Deployment Security

### Development Environment
- ✅ Local network only (192.168.1.x)
- ✅ No HTTPS required (dev convenience)
- ✅ Generous rate limits
- ✅ Logging enabled

### Staging Environment
- 🔄 Staging server (separate Supabase project)
- 🔄 HTTPS enabled
- 🔄 Same rate limits as production
- 🔄 Comprehensive logging
- 🔄 Regular security audits

### Production Environment
- 🔐 HTTPS only (no HTTP)
- 🔐 Strict CORS (whitelisted domains only)
- 🔐 Aggressive rate limiting
- 🔐 Secrets in AWS Secrets Manager
- 🔐 WAF (Web Application Firewall)
- 🔐 DDoS protection (Cloudflare)
- 🔐 Regular backups (Supabase handles)
- 🔐 Audit logging enabled

---

## Threat Model & Mitigation

### Threat: Unauthorized Data Access
**Severity:** HIGH
**Mitigation:**
- ✅ Row-Level Security on database
- ✅ Service key never exposed to frontend
- ✅ CORS restricts origins
- ✅ HTTPS prevents man-in-the-middle

### Threat: API Rate Limiting Bypass
**Severity:** MEDIUM
**Mitigation:**
- ✅ slowapi rate limiter on all endpoints
- ✅ IP-based rate limiting (can upgrade to Redis)
- ✅ Different limits per endpoint (voice = 30/min)

### Threat: Voice Data Leakage
**Severity:** MEDIUM
**Mitigation:**
- ✅ Audio processed locally (Moonshine ONNX)
- ✅ No audio stored permanently
- ✅ HTTPS encrypts in-transit
- ✅ Temp files securely deleted

### Threat: SQL Injection
**Severity:** HIGH
**Mitigation:**
- ✅ Supabase SDK parameterization
- ✅ Pydantic input validation
- ✅ No raw SQL strings

### Threat: XSS (Cross-Site Scripting)
**Severity:** LOW (mobile app, not web browser)
**Mitigation:**
- ✅ React escapes JSX by default
- ✅ No innerHTML usage
- ✅ Input sanitization in forms

### Threat: CSRF (Cross-Site Request Forgery)
**Severity:** MEDIUM (mitigated)
**Mitigation:**
- ✅ CORS restricts origins
- ✅ POST/PATCH/DELETE only from whitelisted sources
- ✅ Frontend enforces Content-Type: application/json

### Threat: DDoS Attacks
**Severity:** MEDIUM
**Mitigation:**
- ✅ Rate limiting per IP
- ✅ AWS DDoS Protection (production)
- ✅ Cloudflare DDoS protection (production)
- ✅ Auto-scaling Uvicorn instances

### Threat: Brute Force (Future)
**Severity:** LOW (no password auth yet)
**When auth added:**
- Implement account lockout after N failed attempts
- Rate limit login endpoint more aggressively
- Use CAPTCHA for suspicious activity

---

## Compliance & Standards

### Data Privacy
- ✅ No PII stored (only inventory data)
- ✅ No tracking/analytics (MVP)
- ✅ Audio not recorded
- ✅ GDPR-ready (delete on request)

### Standards Compliance
- ✅ REST API (RFC 7231)
- ✅ HTTP Security Headers (OWASP)
- ✅ CORS (W3C specification)
- ✅ OpenAPI/Swagger for documentation

### Code Quality
- ✅ TypeScript strict mode
- ✅ Pydantic strict validation
- ✅ Comprehensive error handling
- ✅ Logging on all critical paths

---

## Security Checklist for Deployment

### Before Going to Production
- [ ] All secrets in AWS Secrets Manager (not in code)
- [ ] HTTPS certificate installed
- [ ] CORS whitelist configured
- [ ] Rate limiting tested
- [ ] Database backups automated
- [ ] Monitoring & alerting set up
- [ ] Incident response plan documented
- [ ] Security audit completed
- [ ] Penetration testing (optional, recommended)
- [ ] Load testing to find breaking points
- [ ] Documentation updated
- [ ] Team trained on security practices

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [HTTP Security Headers](https://securityheaders.com/)
- [CORS Specification](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
