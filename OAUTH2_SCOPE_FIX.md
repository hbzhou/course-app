# OAuth2 Scope Configuration Fix

## Issue
Error: `Invalid scopes: openid,profile,email`

## Root Cause
OAuth2 specification requires scopes to be **space-separated**, not comma-separated.

## Fix Applied
The backend code now converts comma-separated scopes to space-separated format.

## Actions Required

### 1. Restart Backend (MANDATORY)
```bash
# Stop current backend (Ctrl+C in the terminal)
./gradlew api:bootRun
```

The code fix is already in place, but you need to restart for it to take effect.

### 2. Verify Keycloak Client Scopes

The Keycloak client must have the requested scopes enabled:

1. **Open Keycloak Admin**: http://localhost:8080
2. **Navigate to**: Clients → `course-app` → Client scopes tab
3. **Verify** these scopes are assigned:
   - ✅ `openid` (should be in "Assigned default client scopes")
   - ✅ `profile` (should be in "Assigned default client scopes")
   - ✅ `email` (should be in "Assigned default client scopes")

If any are missing:
1. Click "Add client scope"
2. Select: `openid`, `profile`, `email`
3. Click "Add" → "Default"

### 3. Test OAuth2 Login Again

```bash
# Visit login page
open http://localhost:3000/login

# Click "Login with OAuth2 (Keycloak)"
# Should now work without scope error
```

### 4. Verify in Logs

After restarting backend, you should see in logs:
```
OAuth2 callback received - code: xxx..., error: null
OAuth2 callback successful, redirecting to frontend
```

No more "Invalid scopes" error.

## Why This Happened

**OAuth2 Specification**:
- Scope parameter must be space-separated: `scope=openid profile email`
- NOT comma-separated: `scope=openid,profile,email` ❌

**Our Fix**:
```kotlin
// Convert comma-separated scopes to space-separated
val formattedScope = scope.replace(",", " ")
```

This ensures proper OAuth2 compliance regardless of how it's configured in `application.properties`.

## Common Keycloak Scope Issues

### Default Scopes Not Enabled

If you still get scope errors after restarting, check Keycloak client scopes:

**Symptoms**:
- "Invalid scopes: profile"
- "Invalid scopes: email"
- "Unknown scope"

**Fix**:
1. Keycloak → Clients → `course-app` → **Client scopes** tab
2. Make sure these are in "Assigned default client scopes":
   - `openid` (required)
   - `profile` (required)
   - `email` (required)
3. If missing, add them:
   - Click "Add client scope"
   - Select missing scopes
   - Choose "Default" (not "Optional")
   - Click "Add"

### Scope Not Available in Realm

If a scope doesn't exist at all in Keycloak:

**Symptoms**:
- "Scope not found"

**Fix**:
1. Keycloak → Client scopes (left sidebar)
2. Verify these exist:
   - `openid`
   - `profile`
   - `email`
3. If missing, create them (but they should exist by default)

## Verification Commands

### Check Backend OAuth2 Config
```bash
curl http://localhost:8081/api/auth/oauth2/config
```

Should show:
```json
{
  "scope": "openid,profile,email",
  "status": "configured"
}
```

### Check Keycloak Well-Known Config
```bash
curl http://localhost:8080/realms/course-app/.well-known/openid-configuration | jq '.scopes_supported'
```

Should include:
```json
[
  "openid",
  "profile",
  "email",
  ...
]
```

### Test Authorization URL
```bash
# This URL should work (will redirect to Keycloak login)
open "http://localhost:8080/realms/course-app/protocol/openid-connect/auth?response_type=code&client_id=course-app&redirect_uri=http://localhost:8081/api/auth/oauth2/callback&scope=openid%20profile%20email"
```

Note: `%20` is URL-encoded space

## Still Getting Errors?

If you still see scope errors after:
1. ✅ Restarting backend
2. ✅ Verifying client scopes in Keycloak
3. ✅ Testing login again

Then:

### Enable Debug Logging

Add to `application.properties`:
```properties
logging.level.org.springframework.security.oauth2=DEBUG
logging.level.com.itsz.app.auth.controller.OAuth2AuthController=DEBUG
```

This will show exactly what scope string is being sent to Keycloak.

### Check Actual HTTP Request

Use browser DevTools → Network tab:
1. Click "Login with OAuth2"
2. Look for redirect to Keycloak
3. Check the URL query parameters
4. Verify `scope=openid%20profile%20email` (spaces encoded as %20)

If you see `scope=openid,profile,email` (commas), backend wasn't restarted.

## Summary

✅ **Code fix**: Already applied
🔄 **Action needed**: Restart backend
✅ **Keycloak config**: Verify client scopes are assigned

After restart, OAuth2 login should work without scope errors.
