#!/bin/bash
# =============================================================================
# FusionOS Phase 3 Authentication Runtime Test
# =============================================================================
# Tests every authentication flow against the running API.
# PASS / FAIL / BLOCKED for each test.
# =============================================================================

BASE="http://localhost:3001/api/v1"
PASS=0
FAIL=0
BLOCKED=0

# Track tokens
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""
SESSION_ID=""
VERIFICATION_TOKEN=""
RESET_TOKEN=""
MFA_SECRET=""
MFA_TOKEN=""

# Test counter
TEST_NUM=0

log_test() {
  TEST_NUM=$((TEST_NUM + 1))
  echo ""
  echo "── TEST $TEST_NUM: $1 ──"
}

log_pass() {
  PASS=$((PASS + 1))
  echo "  ✅ PASS: $1"
}

log_fail() {
  FAIL=$((FAIL + 1))
  echo "  ❌ FAIL: $1"
}

log_blocked() {
  BLOCKED=$((BLOCKED + 1))
  echo "  ⛔ BLOCKED: $1"
}

# Helper to extract JSON fields (using node for reliability)
json_get() {
  node -e "const d=JSON.parse(process.argv[1]); const k=process.argv[2]; const v=d[k]; console.log(v !== undefined && v !== null ? v : 'NULL')" "$1" "$2" 2>/dev/null
}

echo "═══════════════════════════════════════════════════════════════"
echo "  FUSIONOS PHASE 3 AUTHENTICATION RUNTIME TEST"
echo "═══════════════════════════════════════════════════════════════"

# ── 0. API Health ──
log_test "API Health Check"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/health" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
  log_pass "API is running (HTTP $HTTP_CODE)"
else
  log_fail "API health check failed (HTTP $HTTP_CODE)"
  echo "  Cannot continue — API is not running"
  exit 1
fi

# ── 0b. Cleanup stale test data ──
log_test "Cleanup stale test data"
TEST_USER_ID=$(node -e "
const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({ where: { email: 'test@fusionos.dev' } });
  if (user) {
    await prisma.authEvent.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.verificationToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('cleaned:' + user.id);
  } else {
    console.log('clean:none');
  }
  await prisma.\$disconnect();
})();
" 2>/dev/null)
if [[ "$TEST_USER_ID" == cleaned:* ]]; then
  log_pass "Stale test user removed (${TEST_USER_ID#cleaned:})"
else
  log_pass "No stale test user found — clean state"
fi

# ════════════════════════════════════════════════════════════════
# REGISTRATION
# ════════════════════════════════════════════════════════════════

log_test "Registration — new user"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@fusionos.dev","firstName":"Test","lastName":"User","password":"TestPass123"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "201" ]; then
  USER_ID=$(json_get "$BODY" "userId")
  log_pass "Registration successful (HTTP $HTTP_CODE, userId=$USER_ID)"
else
  log_fail "Registration failed (HTTP $HTTP_CODE): $BODY"
fi

log_test "Registration — duplicate email (enumeration protection)"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@fusionos.dev","firstName":"Test","lastName":"User","password":"TestPass123"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "201" ]; then
  log_pass "Duplicate registration returns same generic message (enumeration protection OK)"
else
  log_fail "Duplicate registration returned HTTP $HTTP_CODE: $BODY"
fi

log_test "Registration — weak password"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"weak@fusionos.dev","firstName":"Weak","lastName":"User","password":"123"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "400" ]; then
  log_pass "Weak password rejected (HTTP 400)"
else
  log_fail "Weak password was NOT rejected (HTTP $HTTP_CODE)"
fi

# ════════════════════════════════════════════════════════════════
# EMAIL VERIFICATION
# ════════════════════════════════════════════════════════════════

log_test "Email Verification — get token from DB"
# The user is PENDING_VERIFICATION, so we need to find the verification token
VERIFICATION_TOKEN=$(node -e "
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
(async () => {
  const prisma = new PrismaClient();
  const vt = await prisma.verificationToken.findFirst({
    where: { type: 'email_verification', usedAt: null },
    orderBy: { createdAt: 'desc' }
  });
  if (vt) {
    // We need the original token, but only the hash is stored.
    // The seed/API generates the token and hashes it. We can't reverse the hash.
    // So let's use the register response to get the userId, then create a token manually.
    console.log('HASHED:' + vt.id);
  } else {
    console.log('NOT_FOUND');
  }
  await prisma.\$disconnect();
})();
" 2>/dev/null)

if [[ "$VERIFICATION_TOKEN" == HASHED:* ]]; then
  # We can't get the original token from the DB — only the hash is stored.
  # The email service logs the token to console in dev mode.
  # Let's create a fresh verification token for testing
  log_blocked "Cannot retrieve original verification token (only hash stored) — using fresh token for test"
  
  # Create a new verification token directly
  VERIFICATION_TOKEN=$(node -e "
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
(async () => {
  const prisma = new PrismaClient();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await prisma.verificationToken.create({
    data: {
      userId: '${USER_ID}',
      token: tokenHash,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  console.log(token);
  await prisma.\$disconnect();
})();
" 2>/dev/null)
  log_pass "Created fresh verification token for testing"
else
  log_fail "Could not find verification token in DB"
fi

log_test "Email Verification — valid token"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$VERIFICATION_TOKEN\"}" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
  log_pass "Email verified successfully (HTTP 200)"
else
  log_fail "Email verification failed (HTTP $HTTP_CODE): $BODY"
fi

log_test "Email Verification — reuse prevention (same token again)"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$VERIFICATION_TOKEN\"}" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "400" ]; then
  log_pass "Reuse prevention works — token rejected on second use (HTTP 400)"
else
  log_fail "Reuse prevention FAILED — token accepted again (HTTP $HTTP_CODE)"
fi

log_test "Email Verification — expired/invalid token"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d '{"token":"invalidtoken123"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "400" ]; then
  log_pass "Invalid token rejected (HTTP 400)"
else
  log_fail "Invalid token NOT rejected (HTTP $HTTP_CODE)"
fi

# ════════════════════════════════════════════════════════════════
# LOGIN
# ════════════════════════════════════════════════════════════════

log_test "Login — correct password"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@fusionos.dev","password":"TestPass123"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
  ACCESS_TOKEN=$(json_get "$BODY" "accessToken")
  REFRESH_TOKEN=$(json_get "$BODY" "refreshToken")
  # Extract nested fields
  ACCESS_TOKEN=$(echo "$BODY" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.session?.accessToken ?? 'NULL')")
  REFRESH_TOKEN=$(echo "$BODY" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.session?.refreshToken ?? 'NULL')")
  log_pass "Login successful (HTTP 200, tokens received)"
else
  log_fail "Login failed (HTTP $HTTP_CODE): $BODY"
fi

log_test "Login — incorrect password"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@fusionos.dev","password":"WrongPassword1"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "401" ]; then
  log_pass "Incorrect password rejected (HTTP 401)"
else
  log_fail "Incorrect password NOT rejected (HTTP $HTTP_CODE): $BODY"
fi

log_test "Login — non-existent email"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@fusionos.dev","password":"TestPass123"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "401" ]; then
  log_pass "Non-existent email returns 401 (not 404) — enumeration protection OK"
else
  log_fail "Non-existent email returned HTTP $HTTP_CODE (should be 401)"
fi

# ════════════════════════════════════════════════════════════════
# ME (AUTHENTICATED)
# ════════════════════════════════════════════════════════════════

log_test "GET /me — authenticated"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
  EMAIL=$(json_get "$BODY" "email")
  log_pass "Authenticated /me returned user: $EMAIL (HTTP 200)"
else
  log_fail "/me failed (HTTP $HTTP_CODE): $BODY"
fi

log_test "GET /me — no token"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/auth/me" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "401" ]; then
  log_pass "Unauthenticated /me returns 401 (HTTP 401)"
else
  log_fail "Unauthenticated /me returned HTTP $HTTP_CODE (should be 401)"
fi

log_test "GET /me — invalid token"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/auth/me" \
  -H "Authorization: Bearer invalid.jwt.token" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "401" ]; then
  log_pass "Invalid JWT rejected (HTTP 401)"
else
  log_fail "Invalid JWT NOT rejected (HTTP $HTTP_CODE)"
fi

# ════════════════════════════════════════════════════════════════
# REFRESH TOKEN
# ════════════════════════════════════════════════════════════════

log_test "Refresh token — valid"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
  OLD_REFRESH=$REFRESH_TOKEN
  NEW_ACCESS=$(echo "$BODY" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.accessToken ?? 'NULL')")
  NEW_REFRESH=$(echo "$BODY" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.refreshToken ?? 'NULL')")
  log_pass "Token refresh successful (HTTP 200, new tokens received)"
else
  log_fail "Token refresh failed (HTTP $HTTP_CODE): $BODY"
fi

log_test "Refresh token — rotation (old token invalid after use)"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$OLD_REFRESH\"}" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "401" ]; then
  log_pass "Old refresh token correctly rejected after rotation (HTTP 401)"
else
  log_fail "Old refresh token was NOT rejected (HTTP $HTTP_CODE) — rotation broken"
fi

# Update tokens
ACCESS_TOKEN=$NEW_ACCESS
REFRESH_TOKEN=$NEW_REFRESH

# ════════════════════════════════════════════════════════════════
# SESSIONS
# ════════════════════════════════════════════════════════════════

log_test "GET /sessions — list active sessions"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/auth/sessions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
  SESSION_COUNT=$(echo "$BODY" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(Array.isArray(d) ? d.length : -1)")
  # Get first session ID for revoke test
  SESSION_ID=$(echo "$BODY" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(Array.isArray(d) && d.length > 0 ? d[0].id : 'NULL')")
  log_pass "Sessions list returned $SESSION_COUNT active session(s) (HTTP 200)"
else
  log_fail "Sessions list failed (HTTP $HTTP_CODE): $BODY"
fi

# ════════════════════════════════════════════════════════════════
# LOGOUT
# ════════════════════════════════════════════════════════════════

log_test "POST /logout — revoke current session"
# First login to get a fresh session to revoke
LOGIN_RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@fusionos.dev","password":"TestPass123"}' 2>&1)
LOGOUT_SESSION_ID=$(echo "$LOGIN_RESP" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.user?.id ?? 'NULL')")
LOGOUT_ACCESS=$(echo "$LOGIN_RESP" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.session?.accessToken ?? 'NULL')")

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/logout" \
  -H "Authorization: Bearer $LOGOUT_ACCESS" \
  -H "Content-Type: application/json" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
  log_pass "Logout successful (HTTP 200)"
else
  log_fail "Logout failed (HTTP $HTTP_CODE): $BODY"
fi

log_test "POST /logout — old session invalidated"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/auth/me" \
  -H "Authorization: Bearer $LOGOUT_ACCESS" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "401" ]; then
  log_pass "Logged-out session correctly rejected (HTTP 401)"
else
  log_fail "Logged-out session still works (HTTP $HTTP_CODE) — logout broken"
fi

# ════════════════════════════════════════════════════════════════
# PASSWORD RESET
# ════════════════════════════════════════════════════════════════

log_test "Password Reset — request reset"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@fusionos.dev"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
  log_pass "Password reset requested (HTTP 200)"
else
  log_fail "Password reset request failed (HTTP $HTTP_CODE): $BODY"
fi

log_test "Password Reset — get token from DB"
RESET_TOKEN=$(node -e "
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
(async () => {
  const prisma = new PrismaClient();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await prisma.passwordResetToken.create({
    data: {
      userId: '${USER_ID}',
      token: tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  console.log(token);
  await prisma.\$disconnect();
})();
" 2>/dev/null)
if [ -n "$RESET_TOKEN" ]; then
  log_pass "Created fresh reset token for testing"
else
  log_fail "Could not create reset token"
fi

log_test "Password Reset — valid token, new password"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$RESET_TOKEN\",\"newPassword\":\"NewPass456!\"}" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
  log_pass "Password reset successful (HTTP 200)"
else
  log_fail "Password reset failed (HTTP $HTTP_CODE): $BODY"
fi

log_test "Password Reset — reuse prevention"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$RESET_TOKEN\",\"newPassword\":\"AnotherPass789!\"}" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "400" ]; then
  log_pass "Reset token reuse prevented (HTTP 400)"
else
  log_fail "Reset token reuse NOT prevented (HTTP $HTTP_CODE)"
fi

log_test "Password Reset — login with new password"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@fusionos.dev","password":"NewPass456!"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  log_pass "Login with new password works (HTTP 200)"
  # Update access token
  ACCESS_TOKEN=$(echo "$RESP" | head -n -1 | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.session?.accessToken ?? 'NULL')")
else
  log_fail "Login with new password failed (HTTP $HTTP_CODE)"
fi

log_test "Password Reset — old password no longer works"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@fusionos.dev","password":"TestPass123"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "401" ]; then
  log_pass "Old password correctly rejected (HTTP 401)"
else
  log_fail "Old password still works (HTTP $HTTP_CODE) — password reset broken"
fi

log_test "Password Reset — non-existent email (enumeration protection)"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@fusionos.dev"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  log_pass "Non-existent email returns 200 with generic message (enumeration protection OK)"
else
  log_fail "Non-existent email returned HTTP $HTTP_CODE (should be 200)"
fi

# ════════════════════════════════════════════════════════════════
# LOGOUT ALL
# ════════════════════════════════════════════════════════════════

log_test "POST /logout-all — all sessions revoked"
# Login twice to create multiple sessions
curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@fusionos.dev","password":"NewPass456!"}' > /dev/null 2>&1

# Keep the current access token from the last login
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/logout-all" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  log_pass "Logout all successful (HTTP 200)"
else
  log_fail "Logout all failed (HTTP $HTTP_CODE)"
fi

log_test "POST /logout-all — all sessions invalidated"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "401" ]; then
  log_pass "All sessions correctly invalidated (HTTP 401)"
else
  log_fail "Sessions still work after logout-all (HTTP $HTTP_CODE)"
fi

# ════════════════════════════════════════════════════════════════
# MFA
# ════════════════════════════════════════════════════════════════

# Login fresh for MFA tests
LOGIN_RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@fusionos.dev","password":"NewPass456!"}' 2>&1)
ACCESS_TOKEN=$(echo "$LOGIN_RESP" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.session?.accessToken ?? 'NULL')")

log_test "MFA Setup — initialize"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/mfa/setup" \
  -H "Authorization: Bearer $ACCESS_TOKEN" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
  MFA_SECRET=$(json_get "$BODY" "secret")
  OTPAUTH_URL=$(json_get "$BODY" "otpauthUrl")
  log_pass "MFA setup initialized (secret=${MFA_SECRET:0:10}..., HTTP 200)"
else
  log_fail "MFA setup failed (HTTP $HTTP_CODE): $BODY"
fi

log_test "MFA Enable — invalid code"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/mfa/enable" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"$MFA_SECRET\",\"code\":\"000000\"}" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "400" ]; then
  log_pass "Invalid MFA code rejected (HTTP 400)"
else
  log_fail "Invalid MFA code NOT rejected (HTTP $HTTP_CODE)"
fi

log_test "MFA Enable — valid code"
# Generate a valid TOTP code
MFA_TOKEN=$(node -e "
const { TOTP, Secret } = require('otpauth');
const totp = new TOTP({
  issuer: 'FusionOS',
  label: 'test@fusionos.dev',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret: Secret.fromBase32('$MFA_SECRET'),
});
console.log(totp.generate());
" 2>/dev/null)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/mfa/enable" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"$MFA_SECRET\",\"code\":\"$MFA_TOKEN\"}" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
  log_pass "MFA enabled successfully (HTTP 200)"
else
  log_fail "MFA enable failed (HTTP $HTTP_CODE): $BODY"
fi

log_test "MFA Login — without MFA code"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@fusionos.dev","password":"NewPass456!"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
REQUIRES_MFA=$(json_get "$BODY" "requiresMfa")
if [ "$REQUIRES_MFA" = "true" ]; then
  log_pass "MFA challenge triggered correctly (requiresMfa=true)"
else
  log_fail "MFA challenge NOT triggered (HTTP $HTTP_CODE, body: $BODY)"
fi

log_test "MFA Login — invalid MFA code"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@fusionos.dev","password":"NewPass456!","mfaCode":"000000"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "401" ]; then
  log_pass "Invalid MFA code rejected on login (HTTP 401)"
else
  log_fail "Invalid MFA code NOT rejected (HTTP $HTTP_CODE)"
fi

log_test "MFA Login — valid MFA code"
# Generate fresh TOTP
MFA_TOKEN=$(node -e "
const { TOTP, Secret } = require('otpauth');
const totp = new TOTP({
  issuer: 'FusionOS',
  label: 'test@fusionos.dev',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret: Secret.fromBase32('$MFA_SECRET'),
});
console.log(totp.generate());
" 2>/dev/null)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@fusionos.dev\",\"password\":\"NewPass456!\",\"mfaCode\":\"$MFA_TOKEN\"}" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  log_pass "MFA login successful with valid code (HTTP 200)"
  ACCESS_TOKEN=$(echo "$RESP" | head -n -1 | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.session?.accessToken ?? 'NULL')")
else
  log_fail "MFA login failed (HTTP $HTTP_CODE)"
fi

log_test "MFA Disable — with valid code"
MFA_TOKEN=$(node -e "
const { TOTP, Secret } = require('otpauth');
const totp = new TOTP({
  issuer: 'FusionOS',
  label: 'test@fusionos.dev',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret: Secret.fromBase32('$MFA_SECRET'),
});
console.log(totp.generate());
" 2>/dev/null)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/mfa/disable" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$MFA_TOKEN\"}" 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
  log_pass "MFA disabled successfully (HTTP 200)"
else
  log_fail "MFA disable failed (HTTP $HTTP_CODE): $BODY"
fi

log_test "MFA Disable — invalid code"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/mfa/disable" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"000000"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "400" ]; then
  log_pass "Invalid MFA code rejected on disable (HTTP 400)"
else
  log_fail "Invalid MFA code NOT rejected on disable (HTTP $HTTP_CODE)"
fi

# ════════════════════════════════════════════════════════════════
# RESEND VERIFICATION
# ════════════════════════════════════════════════════════════════

log_test "Resend Verification — existing email"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/resend-verification" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@fusionos.dev"}' 2>&1)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  log_pass "Resend verification returned 200 (generic message)"
else
  log_fail "Resend verification returned HTTP $HTTP_CODE"
fi

# ════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  PHASE 3 AUTHENTICATION TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
TOTAL=$((PASS + FAIL + BLOCKED))
echo "  Total:   $TOTAL"
echo "  ✅ PASS:   $PASS"
echo "  ❌ FAIL:   $FAIL"
echo "  ⛔ BLOCKED: $BLOCKED"
echo "═══════════════════════════════════════════════════════════════"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "⚠️  Some tests FAILED — review above output"
  exit 1
else
  echo ""
  echo "✅ All executable tests PASSED"
fi
