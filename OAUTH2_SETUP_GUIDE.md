# OAuth2 Authorization Code Flow Implementation Guide

## Overview

This guide explains the Spring Security OAuth2 Authorization Code flow using Keycloak as the authorization server. The backend owns authorization-code exchange and session establishment.

- **No password handling in frontend**: Users authenticate directly with Keycloak
- **Framework-managed callback and state**: Spring Security handles callback, state, and code exchange
- **Server-managed session**: Frontend does not perform manual code exchange
- **Centralized authentication**: Single sign-on capability across multiple applications

## Architecture

```
Browser (UI)
  -> /oauth2/authorization/keycloak
  -> Keycloak login
  -> /login/oauth2/code/keycloak (backend callback)
  -> Spring Security establishes session
  -> UI calls /api/auth/me to bootstrap current user
```

## Prerequisites

- Docker and Docker Compose installed
- Gradle (for backend)
- Node.js and npm (for frontend)

## Setup Instructions

### 1. Start Infrastructure Services

Start MySQL, Redis, and Keycloak:

```bash
docker compose up -d
```

Wait for Keycloak to fully start (can take 30-60 seconds on first run):

```bash
docker compose logs -f keycloak
```

Look for: `Keycloak 26.0 started`

### 2. Configure Keycloak

#### Access Keycloak Admin Console

1. Open browser: http://localhost:8080
2. Click "Administration Console"
3. Login:
   - Username: `admin`
   - Password: `admin123`

#### Create Realm

1. Click the dropdown in top-left (currently showing "master")
2. Click "Create Realm"
3. Realm name: `course-app`
4. Click "Create"

#### Create Client

1. In the `course-app` realm, go to "Clients" → "Create client"
2. Fill in:
   - **Client type**: OpenID Connect
   - **Client ID**: `course-app`
   - Click "Next"
3. Capability config:
   - **Client authentication**: ON
   - **Authorization**: OFF
   - **Authentication flow**: Check "Standard flow" and "Direct access grants"
   - Click "Next"
4. Login settings:
   - **Root URL**: `http://localhost:3000`
   - **Valid redirect URIs**: 
   - `http://localhost:8081/login/oauth2/code/keycloak`
   - `http://localhost:3000/courses`
   - **Valid post logout redirect URIs**: `http://localhost:3000`
   - **Web origins**: `http://localhost:3000`
   - Click "Save"

#### Get Client Secret

1. Go to "Clients" → "course-app" → "Credentials" tab
2. Copy the "Client secret" value
3. Update `api/src/main/resources/application.properties`:

```properties
spring.security.oauth2.client.registration.keycloak.client-secret=<YOUR_CLIENT_SECRET>
```

Or set environment variable:
```bash
export KEYCLOAK_CLIENT_SECRET=<YOUR_CLIENT_SECRET>
```

#### Create Test User

1. Go to "Users" → "Create new user"
2. Fill in:
   - **Username**: `testuser`
   - **Email**: `testuser@example.com`
   - **Email verified**: ON
   - **First name**: Test
   - **Last name**: User
   - Click "Create"
3. Go to "Credentials" tab
4. Click "Set password"
   - **Password**: `test123`
   - **Temporary**: OFF
   - Click "Save"
5. Click "Save password" in the confirmation dialog

#### Create Roles (Optional)

1. Go to "Realm roles" → "Create role"
2. Create these roles:
   - `admin` - Full access
   - `user` - Read-only access

3. Assign roles to user:
   - Go to "Users" → find your user → "Role mapping" tab
   - Click "Assign role"
   - Select roles → "Assign"

### 3. Start Backend

```bash
./gradlew api:bootRun
```

Backend will start on: http://localhost:8081

### 4. Start Frontend

```bash
cd ui
npm install
npm run dev
```

Frontend will start on: http://localhost:3000

## Testing the OAuth2 Flow

### Test OAuth2 Login

1. Open browser: http://localhost:3000/login
2. Click "Login with OAuth2 (Keycloak)" button
3. You'll be redirected to Keycloak login page
4. Enter credentials:
   - Username: `testuser`
   - Password: `test123`
5. Click "Sign in"
6. You'll be redirected back to the application at `/courses`
7. Verify authenticated session by calling:

```bash
curl -i http://localhost:8081/api/auth/me
```

### Test Legacy JWT Login (Backward Compatibility)

The legacy username/password authentication still works:

1. Go to: http://localhost:3000/login
2. Use traditional login form:
   - Username: `admin`
   - Password: `admin123`
3. Click "Login"
4. Authenticated using legacy JWT

### Session Verification

The backend now manages OAuth2 login and session. The frontend does not call token exchange or refresh endpoints.

### Test Logout

1. Click user profile icon in header
2. Click "Logout"
3. All tokens are cleared from localStorage
4. Redirected to login page

## API Endpoints

### OAuth2 Endpoints (Spring Security)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/oauth2/authorization/keycloak` | GET | Initiates OAuth2 flow and redirects to Keycloak |
| `/login/oauth2/code/keycloak` | GET | Spring Security OAuth2 callback endpoint |
| `/api/auth/me` | GET | Returns authenticated user profile from session or bearer auth |

### Legacy Endpoints (Still Supported)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Username/password login (legacy JWT) |
| `/api/auth/register` | POST | User registration |
| `/api/auth/logout` | DELETE | Logout (clears client-side tokens) |

## Token Storage

### Token (localStorage: `token`)

Stores legacy JWT token only when users sign in via the legacy login endpoint.

### Auth Type (localStorage: `authType`)

- `oauth2` - User logged in via OAuth2 session
- `legacy` - User logged in via legacy JWT

## Security Considerations

### Current Implementation

✅ **Implemented:**
- Authorization Code flow (more secure than implicit flow)
- Token stored in localStorage (accessible, but XSS vulnerable)
- Refresh token rotation
- HTTPS recommended for production
- CORS configuration for cross-origin requests
- Stateless JWT validation

⚠️ **Considerations:**

1. **XSS Protection**: 
   - Tokens in localStorage are vulnerable to XSS attacks
   - Consider using httpOnly cookies in production
   - Implement Content Security Policy (CSP)

2. **Token Expiry**:
   - Access tokens expire in 5 minutes (Keycloak default)
   - Implement automatic refresh before expiry

3. **HTTPS**:
   - Use HTTPS in production for all communications
   - Prevents token interception

4. **PKCE**:
   - Keycloak supports PKCE by default
   - Consider implementing PKCE in Spring client for additional security

### Recommended Production Enhancements

```typescript
// Use httpOnly cookies instead of localStorage
// Backend sets cookie:
response.cookie('access_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 300000 // 5 minutes
});

// Frontend automatically sends cookie with requests
// No localStorage access needed
```

## Troubleshooting

### Error: OAuth2 login redirects to 404 in dev

**Solution**:
1. Start frontend with Vite config that proxies `/oauth2` and `/login/oauth2` to backend `8081`
2. Confirm redirect URL is `/oauth2/authorization/keycloak`

### Error: "Invalid redirect_uri"

**Solution**: 
Add redirect URIs in Keycloak:
- `http://localhost:8081/login/oauth2/code/keycloak`
- `http://localhost:3000/courses`

### Keycloak not starting

**Solution**:
```bash
# Check logs
docker compose logs keycloak

# Recreate database
docker compose down -v
docker compose up -d
```

### CORS errors

**Solution**: 
Add web origins in Keycloak client settings:
- `http://localhost:3000`
- `http://localhost:8081`

### Token expired error

**Solution**: 
Treat this as a session expiration and redirect users to sign in again via OAuth2.

## Migration Path

### From Legacy JWT to OAuth2

1. **Phase 1**: Both authentication methods work (current state)
2. **Phase 2**: Encourage users to use OAuth2 (add UI banner)
3. **Phase 3**: Deprecate legacy JWT endpoints
4. **Phase 4**: Remove legacy JWT implementation

### User Migration

Option 1: **Manual migration** - Users re-authenticate with OAuth2
Option 2: **Automatic migration** - Link existing accounts to OAuth2 users by email

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KEYCLOAK_ISSUER_URI` | `http://localhost:8080/realms/course-app` | Keycloak realm URL |
| `KEYCLOAK_CLIENT_SECRET` | `course-app-secret` | OAuth2 client secret |
| `KEYCLOAK_ADMIN` | `admin` | Keycloak admin username |
| `KEYCLOAK_ADMIN_PASSWORD` | `admin123` | Keycloak admin password |

## Next Steps

1. **Production Setup**:
   - Use external Keycloak instance (not Docker Compose)
   - Configure HTTPS for all services
   - Set up proper DNS for Keycloak realm
   - Use production-grade secrets management

2. **Enhanced Security**:
   - Implement PKCE flow
   - Use httpOnly cookies for token storage
   - Add rate limiting
   - Implement MFA in Keycloak

3. **User Experience**:
   - Improve session-expired UX and re-login prompts
   - Remember me functionality
   - Social login integration (Google, GitHub via Keycloak)

4. **Monitoring**:
   - Log authentication events
   - Monitor session timeout and re-authentication rates
   - Track failed login attempts

## References

- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Spring Security OAuth2 Client](https://docs.spring.io/spring-security/reference/servlet/oauth2/client/index.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
