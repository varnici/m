# OTP Verification — Email & Phone

VentureRoot supports two OTP channels:

| Channel | Provider | Where configured |
|---------|----------|-----------------|
| Email   | Supabase Auth built-in (`signInWithOtp`) | Supabase dashboard |
| Phone   | Custom FastAPI endpoint + Termii SMS | `backend/.env` |

---

## Part 1 — Email OTP (Supabase Auth)

### How it works
1. User enters email on `EmailEntryScreen` → `sendEmailOtp(email)` calls `supabase.auth.signInWithOtp({ email })`
2. Supabase sends a 6-digit magic code to the email inbox
3. User enters it on `OtpEntryScreen` → `verifyEmailOtp(email, token)` calls `supabase.auth.verifyOtp({ email, token, type: 'email' })`
4. Supabase returns a session; `AuthContext.onAuthStateChange` picks it up and routes the user

### Supabase dashboard setup
- **Authentication → Providers → Email**: enable "Email OTP" (disable "Confirm email" if using magic-link flow)
- **Authentication → URL Configuration**: add your app's redirect URL (e.g. `ventureroot://`)

---

## Part 2 — Phone OTP (Custom FastAPI)

### Endpoints (all unauthenticated — pre-auth flow)

```
POST /v1/auth/phone/send-otp
Body: { "phone": "+2348012345678" }   ← E.164 format required
Response: { "message": "Verification code sent." }

POST /v1/auth/phone/verify-otp
Body: { "phone": "+2348012345678", "code": "123456" }
Response: {
  "message": "Phone verified.",
  "session": { "access_token": "...", "refresh_token": "...", "token_type": "bearer", "expires_in": 3600 },
  "user_id": "uuid"
}
```

### Rate limits & security
- Max **6 send requests** per phone per **15 minutes** (returns 429 beyond that)
- Codes are hashed with **bcrypt** before storage — plain code is never persisted
- Max **5 verify attempts** before OTP is voided (requires requesting a new one)
- Codes expire in **5 minutes**
- No code in the verify response (prevents info leakage)

### How it works
1. `sendPhoneOtp(phone)` → POST to gateway → core-banking → generates `secrets.choice` 6-digit code → bcrypt hash → store in `phone_otps` table → send via SMS provider
2. `verifyPhoneOtp(phone, code)` → POST → bcrypt compare → create/find Supabase user (synthetic email `phone_<digits>@phone.ventureroot.internal`) → generate Supabase magic link session → return tokens
3. Frontend calls `supabase.auth.setSession({ access_token, refresh_token })` → session is live

---

## Switching SMS provider

Set `SMS_PROVIDER` in `backend/.env`:

```bash
# Local development — logs code visibly in docker stdout
SMS_PROVIDER=mock

# Production — sends real SMS via Termii
SMS_PROVIDER=termii
TERMII_API_KEY=your_key_from_termii_dashboard
TERMII_SENDER_ID=N-Alert    # generic, pre-approved
TERMII_CHANNEL=generic       # no DND registration needed
```

View mock codes during local dev:
```bash
docker compose logs core-banking --tail=20 | grep -A4 "MockSMS\|====="
```

After changing `.env`, reload with:
```bash
docker compose up -d --force-recreate core-banking
```

---

## Running locally (without Docker)

```bash
cd backend/services/core-banking
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Run the migration first:
```bash
alembic upgrade head
```

---

## Database tables

| Table | Purpose |
|-------|---------|
| `otp_records` | Email/SMS OTP via the older multi-channel OTP service |
| `phone_otps` | Phone OTP records for the new bcrypt-based phone flow |
