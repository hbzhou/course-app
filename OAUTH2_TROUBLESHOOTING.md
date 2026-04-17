# OAuth2 Troubleshooting - Common Errors

## Error: "Required request parameter 'code' for method parameter type String is not present"

### What This Means

The backend OAuth2 callback endpoint (`/api/auth/oauth2/callback`) was called but the `code` parameter was missing. This can happen when:

1. **Keycloak redirect URI mismatch** - The redirect URI configured in Keycloak doesn't match the backend
2. **User canceled login** - User clicked "Cancel" on Keycloak login page
3. **OAuth2 error occurred** - Keycloak returned an error instead of a code
4. **Direct access** - Someone accessed the callback URL directly without going through OAuth2 flow

### ✅ Fixed

**Status**: This error is now handled gracefully in the latest code.

The backend now accepts optional parameters and properly handles error cases:
- Missing `code` → redirects to frontend with error
- OAuth2 `error` parameter → forwards error to frontend
- Both missing → sends "invalid_callback" error

### Verify the Fix

1. **Restart backend** to load the updated code:
   ```bash
   # Stop current backend (Ctrl+C)
   ./gradlew api:bootRun
   ```

2. **Check logs** - You should now see informative logs:
   ```
   INFO: OAuth2 callback received - code: xxx..., error: null, state: http://localhost:3000
   INFO: OAuth2 callback successful, redirecting to frontend
   ```

3. **Try OAuth2 login again** - The error should be caught and displayed properly

---

## Diagnostic Steps

### Step 1: Verify Keycloak Configuration

**Check redirect URIs in Keycloak:**

1. Open Keycloak admin: http://localhost:8080
2. Go to Clients → `course-app` → Settings
3. **Valid redirect URIs** must include:
   ```
   http://localhost:8081/api/auth/oauth2/callback
   http://localhost:3000/oauth2/callback
   ```
4. **Web origins** must include:
   ```
   http://localhost:3000
   ```
5. Click "Save" if you made changes

### Step 2: Test OAuth2 Config

**Check backend configuration:**
```bash
curl http://localhost:8081/api/auth/oauth2/config
```

Expected response:
```json
{
  "clientId": "course-app",
  "authorizationUri": "http://localhost:8080/realms/course-app/protocol/openid-connect/auth",
  "tokenUri": "http://localhost:8080/realms/course-app/protocol/openid-connect/token",
  "redirectUri": "http://localhost:8081/api/auth/oauth2/callback",
  "scope": "openid,profile,email",
  "issuerUri": "http://localhost:8080/realms/course-app",
  "status": "configured"
}
```

If you see an error, check:
- Keycloak is running: `docker compose ps`
- Realm exists: Check in Keycloak admin
- Client exists: Check in Keycloak admin
- Client secret is configured (see Step 3)

### Step 3: Verify Client Secret

**Get the secret from Keycloak:**

1. Keycloak admin → Clients → `course-app` → Credentials tab
2. Copy the **Client secret** (long string like `kE8y1R2wP3...`)

**Update backend:**

**Option A: Environment variable (recommended)**
```bash
export KEYCLOAK_CLIENT_SECRET=<paste-secret-here>
./gradlew api:bootRun
```

**Option B: Update application.properties**
```properties
# api/src/main/resources/application.properties
spring.security.oauth2.client.registration.keycloak.client-secret=<paste-secret-here>
```

Then restart backend.

### Step 4: Test the Complete Flow

**Manual test:**

1. Open: http://localhost:3000/login
2. Click "Login with OAuth2 (Keycloak)"
3. **Watch backend logs** - you should see:
   ```
   Redirecting to: http://localhost:8080/realms/course-app/protocol/openid-connect/auth?...
   ```
4. Login with: `testuser` / `test123`
5. **Watch backend logs again** - you should see:
   ```
   INFO: OAuth2 callback received - code: AbC123..., error: null, state: http://localhost:3000
   INFO: OAuth2 callback successful, redirecting to frontend
   ```
6. Browser redirects to: http://localhost:3000/oauth2/callback?code=...
7. Frontend exchanges code for tokens
8. Final redirect to: http://localhost:3000/courses

**Check localStorage:**
```javascript
// Open browser DevTools → Console
console.log(localStorage.getItem('oauth2User'))
console.log(localStorage.getItem('token'))
console.log(localStorage.getItem('authType'))
```

Should see OAuth2 user info and tokens.

---

## Common Configuration Mistakes

### ❌ Wrong Realm Name

**Symptom**: "Realm not found" or "Invalid issuer"

**Fix**: 
- Realm must be exactly: `course-app` (case-sensitive)
- Check in Keycloak admin (top-left dropdown)
- Verify in `application.properties`:
  ```properties
  spring.security.oauth2.client.provider.keycloak.issuer-uri=http://localhost:8080/realms/course-app
  ```

### ❌ Wrong Client ID

**Symptom**: "Client not found" or "Invalid client"

**Fix**:
- Client ID must be exactly: `course-app`
- Check in Keycloak: Clients → find `course-app`
- Verify in `application.properties`:
  ```properties
  spring.security.oauth2.client.registration.keycloak.client-id=course-app
  ```

### ❌ Missing Redirect URI

**Symptom**: "Invalid redirect_uri" error

**Fix**:
1. Keycloak → Clients → `course-app` → Settings
2. Add to **Valid redirect URIs**:
   ```
   http://localhost:8081/api/auth/oauth2/callback
   ```
3. **Important**: No trailing slash!
4. Click "Save"

### ❌ Wrong Client Secret

**Symptom**: "Unauthorized", "Invalid client credentials"

**Fix**:
1. Get fresh secret from Keycloak → Clients → `course-app` → Credentials
2. Copy exactly (no extra spaces)
3. Update backend configuration
4. Restart backend

### ❌ Temporary Password

**Symptom**: Can login once, then forced to change password

**Fix**:
1. Keycloak → Users → find user → Credentials
2. Set password with **Temporary = OFF**
3. Click "Save"

### ❌ Keycloak Not Running

**Symptom**: Connection refused, can't reach Keycloak

**Fix**:
```bash
# Check status
docker compose ps

# If keycloak is not running or unhealthy
docker compose restart keycloak

# If still failing, reset everything
docker compose down -v
docker compose up -d
```

### ❌ Port Already in Use

**Symptom**: "Port 8080 already in use"

**Fix**:
```bash
# Find what's using port 8080
lsof -ti:8080

# Kill the process (if safe to do so)
kill -9 $(lsof -ti:8080)

# Or change Keycloak port in docker-compose.yml
```

---

## Advanced Debugging

### Enable DEBUG Logging

**Add to `application.properties`:**
```properties
logging.level.org.springframework.security=DEBUG
logging.level.com.itsz.app.auth.controller.OAuth2AuthController=DEBUG
```

Restart backend and watch detailed OAuth2 flow logs.

### Test Keycloak Endpoints Directly

**Get Realm metadata:**
```bash
curl http://localhost:8080/realms/course-app/.well-known/openid-configuration
```

Should return JSON with endpoints.

**Test authorization endpoint:**
```bash
# This should redirect to Keycloak login
open "http://localhost:8080/realms/course-app/protocol/openid-connect/auth?response_type=code&client_id=course-app&redirect_uri=http://localhost:8081/api/auth/oauth2/callback&scope=openid"
```

### Inspect Network Traffic

Use browser DevTools → Network tab:

1. Start OAuth2 login
2. Watch redirects:
   - Frontend → Backend `/api/auth/oauth2/login`
   - Backend → Keycloak `/protocol/openid-connect/auth`
   - Keycloak → Backend `/api/auth/oauth2/callback?code=...`
   - Backend → Frontend `/oauth2/callback?code=...`
   - Frontend → Backend `/api/auth/oauth2/exchange` (POST)

Any break in this chain indicates where the problem is.

---

## Still Having Issues?

### Checklist

- [ ] All Docker containers running (`docker compose ps`)
- [ ] Keycloak accessible at http://localhost:8080
- [ ] Realm `course-app` exists
- [ ] Client `course-app` exists and configured correctly
- [ ] Redirect URIs match exactly (no trailing slashes)
- [ ] Client secret copied and set in backend
- [ ] Test user exists in Keycloak with non-temporary password
- [ ] Backend restarted with latest code
- [ ] Frontend running on port 3000
- [ ] Browser cache cleared

### Clean Slate Restart

```bash
# 1. Stop everything
docker compose down -v
# Stop backend (Ctrl+C)
# Stop frontend (Ctrl+C)

# 2. Start fresh
docker compose up -d
# Wait for Keycloak to fully start (check logs)

# 3. Reconfigure Keycloak (realm, client, user)

# 4. Update client secret in backend

# 5. Start backend
./gradlew api:bootRun

# 6. Start frontend
cd ui && npm run dev

# 7. Test login
```

### Get Detailed Logs

**Backend logs:**
```bash
./gradlew api:bootRun 2>&1 | tee backend.log
```

**Keycloak logs:**
```bash
docker compose logs -f keycloak > keycloak.log
```

**Check for errors** in these log files.

---

## Reference

- **OAuth2 Setup Guide**: [OAUTH2_SETUP_GUIDE.md](./OAUTH2_SETUP_GUIDE.md)
- **Quick Checklist**: [OAUTH2_QUICK_CHECKLIST.md](./OAUTH2_QUICK_CHECKLIST.md)
- **Migration Summary**: [OAUTH2_MIGRATION_SUMMARY.md](./OAUTH2_MIGRATION_SUMMARY.md)
