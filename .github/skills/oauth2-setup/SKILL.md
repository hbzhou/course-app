---
name: oauth2-setup
description: 'Set up, verify, troubleshoot, or extend OAuth2 authentication with Keycloak in course-app. Use when configuring the local Keycloak realm/client/user, debugging redirect or scope errors, reasoning about token exchange and refresh, or working on migration from legacy JWT.'
argument-hint: 'Describe the OAuth2 task (e.g., "set up Keycloak locally" or "debug invalid redirect_uri during login")'
---

# OAuth2 Setup — course-app

## When to Use
- Setting up local OAuth2 authentication with Keycloak
- Debugging login, callback, redirect URI, scope, or token exchange failures
- Working on backend OAuth2 endpoints or Spring Security configuration
- Working on frontend OAuth2 login, callback, token storage, or refresh logic
- Verifying dual-auth behavior between OAuth2 and legacy JWT
- Planning migration away from legacy JWT

---

## System Overview

The app supports two authentication modes:

| Mode | Purpose | Entry point |
|------|---------|-------------|
| OAuth2 with Keycloak | Recommended flow | `/api/auth/oauth2/*` |
| Legacy JWT | Backward compatibility | `/api/auth/login` |

**Local ports:**
- Frontend: `3000`
- Backend: `8081`
- Keycloak: `8080`
- MySQL: `3306`
- Redis: `6379`

**Default local credentials:**

| System | Username | Password |
|--------|----------|----------|
| Keycloak Admin | `admin` | `admin123` |
| OAuth2 test user | `testuser` | `test123` |
| Legacy JWT login | `admin` | `admin123` |

**Token storage:**

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access token | 5 min | `localStorage.token` |
| Refresh token | 30 min | `localStorage.oauth2User.refreshToken` |
| ID token | Keycloak-managed | `localStorage.oauth2User.idToken` |

---

## OAuth2 Flow

```
UI /login
  -> GET /api/auth/oauth2/login
  -> redirect to Keycloak login page
  -> Keycloak redirects to /api/auth/oauth2/callback?code=...
  -> backend redirects to /oauth2/callback?code=...
  -> frontend POSTs code to /api/auth/oauth2/exchange
  -> backend exchanges code for tokens
  -> frontend stores oauth2User, token, authType=oauth2
```

**OAuth2 endpoints:**
- `GET /api/auth/oauth2/login`
- `GET /api/auth/oauth2/callback`
- `POST /api/auth/oauth2/exchange`
- `POST /api/auth/oauth2/refresh`

---

## Standard Workflow

Work in this order when setting up or repairing OAuth2 locally:

```
1. Start infrastructure
2. Configure Keycloak realm and client
3. Configure backend client secret
4. Start backend and frontend
5. Verify login flow end-to-end
6. Debug callback / token issues if needed
```

---

## Step 1 — Start Infrastructure

```bash
docker compose up -d
docker compose logs -f keycloak
```

Wait for Keycloak to finish booting before testing login.

**Healthy state:**
- Keycloak admin console opens at `http://localhost:8080`
- `docker compose ps` shows MySQL, Redis, and Keycloak running

---

## Step 2 — Configure Keycloak

### Realm

Create a realm named `course-app`.

### Client

Create an OpenID Connect client with these settings:

| Setting | Value |
|---------|-------|
| Client ID | `course-app` |
| Client authentication | `ON` |
| Standard flow | Enabled |
| Direct access grants | Enabled |
| Root URL | `http://localhost:3000` |
| Valid redirect URI | `http://localhost:8081/api/auth/oauth2/callback` |
| Valid redirect URI | `http://localhost:3000/oauth2/callback` |
| Post logout redirect URI | `http://localhost:3000` |
| Web origins | `http://localhost:3000` |

### Client Scopes

Ensure these default client scopes are assigned:
- `openid`
- `profile`
- `email`

### Test User

Create a user with:
- Username: `testuser`
- Email: `testuser@example.com`
- Password: `test123`
- Email verified: `ON`
- Temporary password: `OFF`

---

## Step 3 — Configure Backend

Set the client secret from Keycloak credentials.

**Preferred:**
```bash
export KEYCLOAK_CLIENT_SECRET=<paste-secret-here>
```

**Alternative:** update `api/src/main/resources/application.properties`.

Expected backend properties:

```properties
spring.security.oauth2.client.registration.keycloak.client-id=course-app
spring.security.oauth2.client.registration.keycloak.client-secret=${KEYCLOAK_CLIENT_SECRET}
spring.security.oauth2.client.registration.keycloak.authorization-grant-type=authorization_code
spring.security.oauth2.client.registration.keycloak.redirect-uri={baseUrl}/api/auth/oauth2/callback
spring.security.oauth2.client.registration.keycloak.scope=openid,profile,email

spring.security.oauth2.client.provider.keycloak.issuer-uri=http://localhost:8080/realms/course-app
spring.security.oauth2.resourceserver.jwt.issuer-uri=http://localhost:8080/realms/course-app
```

---

## Step 4 — Start the App

```bash
./gradlew api:bootRun
cd ui && npm run dev
```

Expected URLs:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8081`

---

## Step 5 — Verify Login

1. Open `http://localhost:3000/login`
2. Click `Login with OAuth2 (Keycloak)`
3. Authenticate as `testuser` / `test123`
4. Confirm redirect to `/courses`
5. Check local storage for:
   - `oauth2User`
   - `token`
   - `authType = oauth2`

**Success criteria:**
- Protected routes open after login
- Logout clears OAuth2 state
- Legacy login still works from the same login page

---

## Troubleshooting

### Invalid redirect_uri

**Cause:** Keycloak client redirect URIs do not exactly match backend or frontend callback URLs.

**Fix:** Re-check these exact values:
- `http://localhost:8081/api/auth/oauth2/callback`
- `http://localhost:3000/oauth2/callback`

No trailing slash.

### Invalid scopes: openid,profile,email

**Cause:** OAuth2 scopes must be space-separated on the wire. The app handles conversion, but stale backend state or bad Keycloak client scope assignment can still break the flow.

**Fix:**
```bash
./gradlew api:bootRun
```

Then verify `openid`, `profile`, and `email` are assigned as default client scopes.

### Failed to exchange code for token

**Cause:** Client secret mismatch, wrong issuer, or broken callback chain.

**Fix:**
1. Copy the client secret again from Keycloak.
2. Export `KEYCLOAK_CLIENT_SECRET` again.
3. Restart backend.

### Required request parameter 'code' is not present

**Cause:** Callback hit directly, canceled login, or callback error from Keycloak.

**Fix:** Retry the flow from `/login` and inspect backend logs for the callback request.

### CORS errors

**Cause:** Keycloak Web origins missing frontend origin.

**Fix:** Add `http://localhost:3000` to client Web origins.

### Keycloak not starting

**Fix:**
```bash
docker compose down -v
docker compose up -d
docker compose logs -f keycloak
```

### Token expired / 401 after login

**Cause:** Access token expired and refresh flow failed.

**Fix:** Check frontend refresh logic and verify `refreshToken` is present in `oauth2User`.

---

## Debugging Commands

### Check infrastructure

```bash
docker compose ps
docker compose logs -f keycloak
```

### Check Keycloak metadata

```bash
curl http://localhost:8080/realms/course-app/.well-known/openid-configuration | jq
```

### Check backend OAuth2 config

```bash
curl http://localhost:8081/api/auth/oauth2/config
curl http://localhost:8081/actuator/health
```

### Test exchange and refresh manually

```bash
curl -X POST http://localhost:8081/api/auth/oauth2/exchange \
  -H "Content-Type: application/json" \
  -d '{"code":"<code-from-callback>"}'

curl -X POST http://localhost:8081/api/auth/oauth2/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh-token>"}'
```

### Enable debug logging

```properties
logging.level.org.springframework.security=DEBUG
logging.level.org.springframework.security.oauth2=DEBUG
logging.level.com.itsz.app.auth.controller.OAuth2AuthController=DEBUG
```

---

## Implementation Notes

### Backend files
- `docker-compose.yml` — Keycloak container
- `init-keycloak-db.sql` — Keycloak DB bootstrap
- `api/src/main/resources/application.properties` — OAuth2 config
- `api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt` — resource server setup
- `api/src/main/kotlin/com/itsz/app/config/KeycloakJwtAuthenticationConverter.kt` — role extraction
- `api/src/main/kotlin/com/itsz/app/auth/controller/OAuth2AuthController.kt` — login, callback, exchange, refresh

### Frontend files
- `ui/src/context/AuthContext.tsx` — auth type, OAuth2 session, refresh handling
- `ui/src/pages/auth/Login.tsx` — OAuth2 login button
- `ui/src/pages/auth/OAuth2Callback.tsx` — callback exchange flow
- `ui/src/types/user.d.ts` — OAuth2 user type
- `ui/src/App.tsx` — callback route

### Role mapping pattern

Keycloak realm roles can be mapped into Spring authorities in `KeycloakJwtAuthenticationConverter.kt` by reading `realm_access.roles` from the JWT.

### Production direction

- Prefer external Keycloak over local docker-compose
- Use HTTPS everywhere
- Prefer httpOnly cookies over `localStorage`
- Add CSP and rate limiting
- Keep PKCE and token refresh behavior under test

---

## Validation Checklist

- [ ] Keycloak admin console opens
- [ ] Realm `course-app` exists
- [ ] Client `course-app` exists with correct redirect URIs
- [ ] Client secret configured in backend
- [ ] Test user can sign in through Keycloak
- [ ] Frontend stores `oauth2User`, `token`, and `authType`
- [ ] OAuth2 logout works
- [ ] Legacy JWT login still works

---

## References

- Keycloak Admin: `http://localhost:8080`
- API docs: `http://localhost:8081/swagger-ui.html`
- OAuth 2.0 RFC: `https://tools.ietf.org/html/rfc6749`
- Keycloak docs: `https://www.keycloak.org/documentation`
- Spring Security OAuth2 docs: `https://docs.spring.io/spring-security/reference/servlet/oauth2/client/`
