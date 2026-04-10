# OAuth2 with Keycloak Setup & Troubleshooting

## When to Use This Skill

Use this skill when working on any OAuth2-related tasks:
- Setting up OAuth2 authentication with Keycloak
- Configuring OAuth2 clients and realms
- Troubleshooting OAuth2 authentication errors
- Implementing Authorization Code flow
- Managing tokens (access, refresh, ID tokens)
- Migrating from legacy JWT to OAuth2
- Debugging redirect URI issues
- Configuring user roles and permissions in Keycloak
- Implementing token refresh logic
- Understanding the OAuth2 flow in this application

## Architecture Overview

The application supports **dual authentication**:
1. **OAuth2 with Keycloak** (recommended) - Authorization Code flow
2. **Legacy JWT** (backward compatible) - username/password

### OAuth2 Flow

```
User clicks "Login with OAuth2"
    ↓
Frontend → Backend /api/auth/oauth2/login
    ↓
Redirect to Keycloak login page
    ↓
User authenticates in Keycloak
    ↓
Keycloak → Backend /api/auth/oauth2/callback?code=xxx
    ↓
Backend → Frontend /oauth2/callback?code=xxx
    ↓
Frontend → Backend /api/auth/oauth2/exchange (POST code)
    ↓
Backend exchanges code for tokens with Keycloak
    ↓
Backend → Frontend (access_token, refresh_token, id_token)
    ↓
Frontend stores tokens in localStorage
    ↓
✅ User authenticated
```

### Token Types

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token | 5 min | `localStorage.token` | API authentication |
| Refresh Token | 30 min | `localStorage.oauth2User.refreshToken` | Get new access token |
| ID Token | 5 min | `localStorage.oauth2User.idToken` | User identity |

### API Endpoints

**OAuth2 Endpoints:**
- `GET /api/auth/oauth2/login` - Start OAuth2 flow
- `GET /api/auth/oauth2/callback` - Handle Keycloak callback
- `POST /api/auth/oauth2/exchange` - Exchange code for tokens
- `POST /api/auth/oauth2/refresh` - Refresh access token

**Legacy Endpoints (still supported):**
- `POST /api/auth/login` - Username/password authentication
- `POST /api/auth/register` - User registration  
- `DELETE /api/auth/logout` - Logout

---

## Quick Setup Guide (15 Minutes)

### Prerequisites
- Docker & Docker Compose
- Ports available: 8080 (Keycloak), 8081 (Backend), 3000 (Frontend), 3306 (MySQL), 6379 (Redis)

### Step 1: Start Services

```bash
# Start all containers
docker compose up -d

# Wait for Keycloak (30-60 seconds on first start)
docker compose logs -f keycloak
# Look for: "Keycloak 26.0 started"
```

**Verify:**
- Keycloak accessible at http://localhost:8080
- MySQL and Redis running: `docker compose ps`

### Step 2: Configure Keycloak

#### 2.1 Access Admin Console
1. Open http://localhost:8080
2. Click "Administration Console"
3. Login: `admin` / `admin123`

#### 2.2 Create Realm
1. Click dropdown in top-left (shows "master")
2. Click "Create Realm"
3. Name: `course-app`
4. Click "Create"

#### 2.3 Create Client
1. Go to: Clients → Create client
2. **General Settings:**
   - Client type: `OpenID Connect`
   - Client ID: `course-app`
   - Click "Next"
3. **Capability config:**
   - Client authentication: `ON`
   - Authorization: `OFF`
   - Authentication flow: ✅ Standard flow, ✅ Direct access grants
   - Click "Next"
4. **Login settings:**
   - Root URL: `http://localhost:3000`
   - Valid redirect URIs:
     - `http://localhost:8081/api/auth/oauth2/callback`
     - `http://localhost:3000/oauth2/callback`
   - Valid post logout redirect URIs: `http://localhost:3000`
   - Web origins: `http://localhost:3000`
   - Click "Save"

#### 2.4 Configure Client Secret
1. Go to: Clients → course-app → Credentials tab
2. Copy the "Client secret"
3. Update backend:

**Option A (recommended):**
```bash
export KEYCLOAK_CLIENT_SECRET=<paste-secret-here>
./gradlew api:bootRun
```

**Option B:**
```properties
# api/src/main/resources/application.properties
spring.security.oauth2.client.registration.keycloak.client-secret=<paste-secret-here>
```

#### 2.5 Create Test User
1. Go to: Users → Create new user
2. Fill in:
   - Username: `testuser`
   - Email: `testuser@example.com`
   - Email verified: `ON`
   - First name: `Test`
   - Last name: `User`
   - Click "Create"
3. Go to: Credentials tab
4. Click "Set password"
   - Password: `test123`
   - Temporary: `OFF` ⚠️ **Important**
   - Click "Save"

#### 2.6 Verify Client Scopes
1. Go to: Clients → course-app → Client scopes tab
2. Ensure these are in "Assigned default client scopes":
   - ✅ `openid`
   - ✅ `profile`
   - ✅ `email`
3. If missing: Click "Add client scope" → Select missing → "Default" → "Add"

### Step 3: Start Application

```bash
# Terminal 1 - Backend
./gradlew api:bootRun
# Wait for: "Started CourseApplicationKt"

# Terminal 2 - Frontend
cd ui && npm run dev
# Wait for: "Local: http://localhost:3000"
```

### Step 4: Test OAuth2 Login

1. Open http://localhost:3000/login
2. Click "Login with OAuth2 (Keycloak)"
3. Login with `testuser` / `test123`
4. Should redirect to http://localhost:3000/courses
5. Verify in DevTools → Application → Local Storage:
   - `oauth2User` exists
   - `token` exists
   - `authType` = "oauth2"

✅ **Success!** OAuth2 authentication working.

---

## Common Issues & Solutions

### Issue 1: "Invalid redirect_uri"

**Cause:** Redirect URIs in Keycloak don't match backend/frontend URLs

**Fix:**
1. Keycloak → Clients → course-app → Settings
2. Valid redirect URIs must **exactly** match:
   - `http://localhost:8081/api/auth/oauth2/callback` (no trailing slash)
   - `http://localhost:3000/oauth2/callback` (no trailing slash)
3. Click "Save"

### Issue 2: "Invalid scopes: openid,profile,email"

**Cause:** Scopes must be space-separated, not comma-separated (OAuth2 spec)

**Fix:** Code already handles this, but ensure backend restarted:
```bash
# Stop backend (Ctrl+C)
./gradlew api:bootRun
```

**Verify client scopes:**
1. Keycloak → Clients → course-app → Client scopes tab
2. Ensure `openid`, `profile`, `email` are in "Assigned default client scopes"

### Issue 3: "Failed to exchange code for token"

**Cause:** Client secret mismatch

**Fix:**
1. Get fresh secret: Keycloak → Clients → course-app → Credentials
2. Copy entire secret (no extra spaces)
3. Update backend config (Option A or B from Step 2.4)
4. Restart backend

### Issue 4: "Required request parameter 'code' is not present"

**Cause:** Callback endpoint called without authorization code

**Fix:** Already handled in latest code. Restart backend:
```bash
./gradlew api:bootRun
```

**Verify logs show:**
```
INFO: OAuth2 callback received - code: xxx..., error: null
INFO: OAuth2 callback successful, redirecting to frontend
```

### Issue 5: Keycloak Not Starting

**Symptoms:**
- `docker compose ps` shows keycloak unhealthy
- Can't access http://localhost:8080

**Fix:**
```bash
# Reset everything
docker compose down -v
docker compose up -d

# Wait longer (60-90 seconds)
docker compose logs -f keycloak
```

### Issue 6: CORS Errors

**Cause:** Web origins not configured in Keycloak

**Fix:**
1. Keycloak → Clients → course-app → Settings
2. Web origins: `http://localhost:3000`
3. Click "Save"

### Issue 7: Token Expired

**Symptoms:**
- API returns 401 Unauthorized
- Access token expired (5 min lifetime)

**Fix:** Implement auto-refresh in frontend:
```typescript
// Already in AuthContext.tsx
const refreshOAuth2Token = async () => {
  const oauth2User = JSON.parse(localStorage.getItem('oauth2User') || '{}');
  const response = await fetch('/api/auth/oauth2/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: oauth2User.refreshToken })
  });
  // Update tokens in localStorage
};
```

### Issue 8: User Forced to Change Password

**Cause:** "Temporary" flag set to ON when creating user

**Fix:**
1. Keycloak → Users → find user → Credentials
2. Set password with **Temporary = OFF**
3. Click "Save"

### Issue 9: Port 8080 Already in Use

**Fix:**
```bash
# Find process using port 8080
lsof -ti:8080

# Kill it (if safe)
kill -9 $(lsof -ti:8080)

# Or change Keycloak port in docker-compose.yml
```

---

## Configuration Reference

### Backend Configuration

**application.properties:**
```properties
# OAuth2 Client Registration
spring.security.oauth2.client.registration.keycloak.client-id=course-app
spring.security.oauth2.client.registration.keycloak.client-secret=${KEYCLOAK_CLIENT_SECRET}
spring.security.oauth2.client.registration.keycloak.authorization-grant-type=authorization_code
spring.security.oauth2.client.registration.keycloak.redirect-uri={baseUrl}/api/auth/oauth2/callback
spring.security.oauth2.client.registration.keycloak.scope=openid,profile,email

# OAuth2 Provider
spring.security.oauth2.client.provider.keycloak.issuer-uri=http://localhost:8080/realms/course-app
spring.security.oauth2.client.provider.keycloak.user-name-attribute=preferred_username

# OAuth2 Resource Server
spring.security.oauth2.resourceserver.jwt.issuer-uri=http://localhost:8080/realms/course-app
```

**Environment Variables:**
```bash
export KEYCLOAK_CLIENT_SECRET=<your-secret>
export KEYCLOAK_ADMIN=admin
export KEYCLOAK_ADMIN_PASSWORD=admin123
```

### Keycloak Configuration

**docker-compose.yml:**
```yaml
keycloak:
  image: quay.io/keycloak/keycloak:26.0
  environment:
    KEYCLOAK_ADMIN: admin
    KEYCLOAK_ADMIN_PASSWORD: admin123
    KC_DB: mysql
    KC_DB_URL: jdbc:mysql://mysql:3306/keycloakdb
    KC_DB_USERNAME: keycloak
    KC_DB_PASSWORD: keycloak123
  command: start-dev
  ports:
    - "8080:8080"
```

**Key Keycloak Settings:**
- Realm: `course-app`
- Client ID: `course-app`
- Client Protocol: `openid-connect`
- Access Type: `confidential`
- Standard Flow: Enabled
- Direct Access Grants: Enabled
- Valid Redirect URIs: See Step 2.3
- Web Origins: `http://localhost:3000`

### Frontend Configuration

**AuthContext.tsx:**
```typescript
// OAuth2 state
const [oauth2User, setOAuth2User] = useState<OAuth2User | null>(null);
const [authType, setAuthType] = useState<'oauth2' | 'legacy' | null>(null);

// Storage keys
localStorage.setItem('oauth2User', JSON.stringify(oauth2User));
localStorage.setItem('token', accessToken);
localStorage.setItem('authType', 'oauth2');
```

**OAuth2Callback.tsx:**
```typescript
// Handle OAuth2 callback
const code = new URLSearchParams(location.search).get('code');
const response = await fetch('/api/auth/oauth2/exchange', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code })
});
```

---

## Advanced Topics

### Role Mapping

**Map Keycloak roles to application permissions:**

1. **Create realm roles in Keycloak:**
   - Realm roles → Create role
   - Name: `admin`, `user`, `manager`

2. **Assign roles to users:**
   - Users → select user → Role mapping tab
   - Assign role → Select role → Assign

3. **Extract roles in backend:**
```kotlin
// KeycloakJwtAuthenticationConverter.kt
private fun extractAuthorities(jwt: Jwt): Collection<GrantedAuthority> {
    val realmAccess = jwt.claims["realm_access"] as? Map<*, *>
    val roles = realmAccess?.get("roles") as? List<*> ?: emptyList<Any>()
    return roles.mapNotNull { role ->
        role?.let { SimpleGrantedAuthority("ROLE_${it.toString().uppercase()}") }
    }
}
```

### Token Refresh Strategy

**Auto-refresh before expiry:**
```typescript
// In AuthContext.tsx
useEffect(() => {
  if (!oauth2User) return;
  
  // Refresh 1 minute before expiry
  const refreshInterval = (oauth2User.expiresIn - 60) * 1000;
  
  const timer = setInterval(() => {
    refreshOAuth2Token();
  }, refreshInterval);
  
  return () => clearInterval(timer);
}, [oauth2User]);
```

### Production Checklist

- [ ] Use external Keycloak (not Docker Compose)
- [ ] Configure HTTPS for all services
- [ ] Use httpOnly cookies instead of localStorage
- [ ] Implement PKCE flow
- [ ] Add Content Security Policy
- [ ] Set up proper secrets management
- [ ] Configure rate limiting
- [ ] Enable audit logging
- [ ] Set up monitoring (token refresh rates, failed logins)
- [ ] Configure proper token lifetimes
- [ ] Implement proper error handling
- [ ] Add MFA support
- [ ] Configure proper CORS policies
- [ ] Use production database for Keycloak

### Security Considerations

**Current Implementation:**
✅ Authorization Code flow (secure)
✅ Short-lived access tokens (5 min)
✅ Refresh token rotation
✅ Stateless JWT validation
✅ CORS configuration

**Production Improvements:**
⚠️ Use httpOnly cookies (prevent XSS)
⚠️ Implement PKCE (additional security)
⚠️ Add CSP headers
⚠️ Use HTTPS everywhere
⚠️ Implement rate limiting
⚠️ Add request signing

---

## Debugging Commands

### Check Keycloak Health
```bash
# Check if Keycloak is running
docker compose ps keycloak

# View Keycloak logs
docker compose logs -f keycloak

# Check Keycloak realm metadata
curl http://localhost:8080/realms/course-app/.well-known/openid-configuration | jq
```

### Test Backend OAuth2 Config
```bash
# Check backend OAuth2 configuration
curl http://localhost:8081/api/auth/oauth2/config

# Check backend health
curl http://localhost:8081/actuator/health
```

### Verify Tokens
```bash
# Decode JWT tokens at https://jwt.io
# Or use command line:
echo "<token>" | cut -d'.' -f2 | base64 -d | jq
```

### Enable Debug Logging

**Add to application.properties:**
```properties
logging.level.org.springframework.security=DEBUG
logging.level.org.springframework.security.oauth2=DEBUG
logging.level.com.itsz.app.auth.controller.OAuth2AuthController=DEBUG
```

### Test OAuth2 Flow Manually
```bash
# 1. Get authorization URL
curl http://localhost:8081/api/auth/oauth2/login
# Opens browser to Keycloak

# 2. After login, you'll get redirected with code
# Extract code from URL

# 3. Exchange code for tokens
curl -X POST http://localhost:8081/api/auth/oauth2/exchange \
  -H "Content-Type: application/json" \
  -d '{"code": "<code-from-callback>"}'

# 4. Use access token
curl http://localhost:8081/api/courses \
  -H "Authorization: Bearer <access-token>"

# 5. Refresh token
curl -X POST http://localhost:8081/api/auth/oauth2/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refresh-token>"}'
```

---

## Clean Slate Reset

If everything is broken, start fresh:

```bash
# 1. Stop everything
docker compose down -v
# Ctrl+C in backend terminal
# Ctrl+C in frontend terminal

# 2. Clean Docker
docker system prune -a --volumes

# 3. Start services
docker compose up -d

# 4. Wait for Keycloak (check logs)
docker compose logs -f keycloak

# 5. Reconfigure Keycloak from scratch
# Follow Step 2: Configure Keycloak

# 6. Update backend client secret
export KEYCLOAK_CLIENT_SECRET=<new-secret>

# 7. Start backend
./gradlew api:bootRun

# 8. Start frontend
cd ui && npm run dev

# 9. Test login
open http://localhost:3000/login
```

---

## Migration Path: Legacy JWT → OAuth2

### Phase 1: Dual Support (Current)
- Both authentication methods work
- Users can choose OAuth2 or legacy JWT
- No breaking changes

### Phase 2: Encourage OAuth2
- Add UI banner: "Switch to OAuth2 for better security"
- Email users about migration
- Monitor OAuth2 adoption rate

### Phase 3: Deprecate Legacy JWT
- Add deprecation notices
- Set sunset date for legacy JWT
- Provide migration guide for API consumers

### Phase 4: Remove Legacy JWT
- Remove legacy JWT endpoints
- Remove legacy authentication code
- Update documentation

### User Account Linking

**Option 1: Manual migration**
- Users re-authenticate with OAuth2
- Accounts linked by email

**Option 2: Automatic migration**
```kotlin
// Link existing account to OAuth2 user
fun linkOAuth2User(keycloakUserId: String, localUserId: Long) {
    // Store mapping in database
    // Future logins automatically linked
}
```

---

## Reference Links

- **Keycloak Admin**: http://localhost:8080 (admin/admin123)
- **API Documentation**: http://localhost:8081/swagger-ui.html
- **OAuth 2.0 RFC**: https://tools.ietf.org/html/rfc6749
- **Keycloak Documentation**: https://www.keycloak.org/documentation
- **Spring Security OAuth2**: https://docs.spring.io/spring-security/reference/servlet/oauth2/client/
- **OWASP Authentication**: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

---

## Files Modified for OAuth2

### Backend
- `docker-compose.yml` - Added Keycloak service
- `init-keycloak-db.sql` - Keycloak database initialization
- `api/build.gradle.kts` - OAuth2 dependencies
- `api/src/main/resources/application.properties` - OAuth2 configuration
- `api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt` - OAuth2 resource server
- `api/src/main/kotlin/com/itsz/app/config/KeycloakJwtAuthenticationConverter.kt` - Token converter
- `api/src/main/kotlin/com/itsz/app/auth/controller/OAuth2AuthController.kt` - OAuth2 endpoints

### Frontend
- `ui/src/types/user.d.ts` - OAuth2User type
- `ui/src/context/auth-context.ts` - OAuth2 type definitions
- `ui/src/context/AuthContext.tsx` - OAuth2 state management
- `ui/src/pages/auth/Login.tsx` - OAuth2 login button
- `ui/src/pages/auth/OAuth2Callback.tsx` - OAuth2 callback handler (NEW)
- `ui/src/App.tsx` - OAuth2 callback route

---

## Quick Reference Table

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | - |
| Backend | http://localhost:8081 | - |
| Keycloak | http://localhost:8080 | admin / admin123 |
| MySQL | localhost:3306 | admin / welcome123 |
| Redis | localhost:6379 | (no auth) |

| Login Method | Username | Password |
|--------------|----------|----------|
| OAuth2 | testuser | test123 |
| Legacy JWT | admin | admin123 |

| Token | Lifetime | Storage Location |
|-------|----------|------------------|
| Access Token | 5 min | localStorage.token |
| Refresh Token | 30 min | localStorage.oauth2User.refreshToken |
| ID Token | 5 min | localStorage.oauth2User.idToken |
