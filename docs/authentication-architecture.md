# FusionOS Authentication Architecture

| | |
|---|---|
| **Document** | Authentication Architecture |
| **Status** | `AUTHORITATIVE` |
| **Phase** | 3 — Authentication Foundation |
| **Last Updated** | 2026-08-27 |

---

## 1. Overview

FusionOS implements a production-grade authentication system with:

- Argon2id password hashing
- JWT access/refresh token architecture
- Database-backed sessions
- Email verification
- Password reset
- TOTP MFA
- Security event logging
- Rate limiting awareness

Authentication answers **"Who are you?"** — it is independent from authorization ("What can you do?").

---

## 2. Password Security

**Hashing:** Argon2id (memory-hard, resistant to GPU/ASIC attacks)

**Parameters:**
- Memory cost: 64 MB
- Time cost: 3 iterations
- Parallelism: 4 threads

**Policy:**
- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Never:**
- Store plaintext passwords
- Log passwords
- Return password hashes via API
- Compare passwords insecurely

---

## 3. Token Architecture

### Access Token
- **Type:** JWT (HS256)
- **Lifetime:** 15 minutes (configurable)
- **Claims:** `sub` (userId), `email`, `type: "access"`, `iss: "fusionos"`, `aud: "fusionos-api"`
- **Storage:** In-memory on client (not localStorage)

### Refresh Token
- **Type:** JWT (HS256)
- **Lifetime:** 7 days (configurable)
- **Claims:** `sub` (userId), `sessionId`, `type: "refresh"`
- **Storage:** Server-side hash in database; client receives opaque token
- **Rotation:** Refreshed on each use (old token invalidated)

### Token Rotation
When a refresh token is used:
1. Old refresh token is invalidated
2. New access + refresh token pair is issued
3. Session record is updated with new token hashes
4. If the old refresh token was already used → potential token theft → all sessions revoked

---

## 4. Session Management

Sessions are stored in PostgreSQL with:
- Unique session ID (UUID)
- User association
- Token hash (access token)
- Refresh token hash
- Expiration timestamp
- Last used timestamp
- IP address
- User agent

**Session lifecycle:**
1. Created on login
2. Updated on each API call (lastUsedAt)
3. Invalidated on logout (deleted from database)
4. Expired automatically (checked on each request)

---

## 5. Cookie Strategy

For browser clients, refresh tokens can be delivered via:
- HttpOnly, Secure, SameSite=Strict cookies (recommended for production)
- Response body (current implementation — allows flexibility for desktop client)

**Future:** Phase 4+ will implement cookie-based refresh token delivery for web clients.

---

## 6. Email Verification

- Verification token generated on registration
- Token hashed (SHA-256) before storage
- 24-hour expiration
- Single-use (marked as used on verification)
- Old tokens invalidated on resend
- User status changes from PENDING_VERIFICATION to ACTIVE on verification
- Enumeration-protected: always returns success message regardless of email existence

---

## 7. Password Reset

- Reset token generated on request
- Token hashed (SHA-256) before storage
- 1-hour expiration
- Single-use
- Old tokens invalidated on new request
- All sessions invalidated after reset (security best practice)
- Enumeration-protected: always returns success message

---

## 8. MFA / TOTP

**Implementation:** TOTP (Time-based One-Time Password) via `otpauth` library

**Algorithm:** SHA-1, 6 digits, 30-second period

**Flow:**
1. User requests MFA setup → server generates secret + QR code URL
2. User scans QR code with authenticator app
3. User submits a TOTP code to verify → MFA enabled
4. On login, if MFA enabled → user must provide TOTP code
5. User can disable MFA by providing a valid TOTP code

**Secret storage:** Stored as base32 string in database. In production, encrypt at rest.

---

## 9. Rate Limiting

Sensitive endpoints should be rate-limited:
- Login: 5 attempts per minute per IP
- Password reset: 3 requests per hour per email
- Registration: 5 requests per hour per IP
- MFA verification: 5 attempts per minute per user

**Current status:** Rate limiting awareness is built into the architecture. Implementation uses environment-aware configuration. Redis-backed rate limiting will be added when Redis is available.

---

## 10. Security Events

All authentication events are logged to the `auth_events` table:

| Event | Description |
|---|---|
| `register` | New user registered |
| `login_success` | Successful login |
| `login_failure` | Failed login attempt |
| `logout` | User logged out |
| `logout_all` | User logged out from all sessions |
| `email_verified` | Email address verified |
| `password_reset_requested` | Password reset requested |
| `password_reset_completed` | Password reset completed |
| `mfa_enabled` | MFA enabled |
| `mfa_disabled` | MFA disabled |
| `mfa_failure` | Invalid MFA code |
| `session_revoked` | Session revoked |

---

## 11. Account Enumeration Protection

Authentication responses are designed to prevent email enumeration:

| Endpoint | Behavior |
|---|---|
| Login | Generic "Invalid email or password" for all failures |
| Forgot password | Always returns "If this email exists, a reset link has been sent" |
| Registration | Always returns "If this email is available, a verification link has been sent" |
| Resend verification | Always returns success regardless of email existence |

---

## 12. API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Register new user |
| POST | `/api/v1/auth/login` | Public | Login with email/password |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token |
| POST | `/api/v1/auth/verify-email` | Public | Verify email address |
| POST | `/api/v1/auth/resend-verification` | Public | Resend verification email |
| POST | `/api/v1/auth/forgot-password` | Public | Request password reset |
| POST | `/api/v1/auth/reset-password` | Public | Reset password with token |
| GET | `/api/v1/auth/me` | Protected | Get current user profile |
| POST | `/api/v1/auth/logout` | Protected | Logout (revoke session) |
| POST | `/api/v1/auth/logout-all` | Protected | Logout from all sessions |
| GET | `/api/v1/auth/sessions` | Protected | List active sessions |
| POST | `/api/v1/auth/sessions/:id/revoke` | Protected | Revoke specific session |
| POST | `/api/v1/auth/mfa/setup` | Protected | Initialize MFA setup |
| POST | `/api/v1/auth/mfa/enable` | Protected | Enable MFA |
| POST | `/api/v1/auth/mfa/disable` | Protected | Disable MFA |

---

## 13. Frontend Authentication

- Login page at `/auth/login`
- Registration page at `/auth/register`
- Auth context provider wraps the application
- Tokens stored in memory (not localStorage)
- Automatic token refresh on 401 responses
- Protected routing via AuthProvider

---

## 14. Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | — | HMAC signing key (256-bit minimum) |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime |

---

## 15. Future Integration

Phase 4 will add:
- Tenant-aware session context
- Role-based access control guards
- Permission-scoped endpoints
- PostgreSQL RLS policies

Phase 14 will add:
- Real email provider integration
- SMTP/SendGrid configuration

Phase 23 will add:
- Security hardening
- Advanced rate limiting
- Brute force protection
- Account lockout policies
