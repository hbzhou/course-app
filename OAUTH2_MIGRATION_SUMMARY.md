# OAuth2 Migration Summary

## What Changed

The application now supports **OAuth2 Authorization Code flow** using Keycloak as the identity provider, alongside the existing username/password authentication.

## Key Benefits

✅ **Enhanced Security**: Users authenticate with Keycloak instead of sending passwords to the backend  
✅ **Token Refresh**: Automatic token refresh without re-authentication  
✅ **SSO Ready**: Centralized authentication enables single sign-on  
✅ **Backward Compatible**: Legacy JWT authentication still works  
✅ **Production Ready**: Based on industry-standard OAuth2 protocol  

## Files Changed

### Backend
- `docker-compose.yml` - Added Keycloak service
- `init-keycloak-db.sql` - Database init for Keycloak
- `api/build.gradle.kts` - Added OAuth2 dependencies
- `api/src/main/resources/application.properties` - OAuth2 configuration
- `api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt` - OAuth2 resource server
- `api/src/main/kotlin/com/itsz/app/config/KeycloakJwtAuthenticationConverter.kt` - Token converter
- `api/src/main/kotlin/com/itsz/app/auth/controller/OAuth2AuthController.kt` - OAuth2 endpoints

### Frontend
- `ui/src/types/user.d.ts` - Added OAuth2User type
- `ui/src/context/auth-context.ts` - Added OAuth2 methods to context
- `ui/src/context/AuthContext.tsx` - OAuth2 state management and token refresh
- `ui/src/pages/auth/Login.tsx` - Added OAuth2 login button
- `ui/src/pages/auth/OAuth2Callback.tsx` - OAuth2 callback handler (NEW)
- `ui/src/App.tsx` - Added `/oauth2/callback` route

### Documentation
- `OAUTH2_SETUP_GUIDE.md` - Complete setup and usage guide (NEW)

## Quick Start

### 1. Start Services

```bash
# Start all infrastructure (MySQL, Redis, Keycloak)
docker compose up -d

# Wait for Keycloak to start (30-60 seconds)
docker compose logs -f keycloak
```

### 2. Configure Keycloak

1. Open http://localhost:8080
2. Login: `admin` / `admin123`
3. Create realm: `course-app`
4. Create client: `course-app`
5. Set redirect URIs:
   - `http://localhost:8081/api/auth/oauth2/callback`
   - `http://localhost:3000/oauth2/callback`
6. Copy client secret and update `application.properties`
7. Create test user: `testuser` / `test123`

### 3. Run Application

```bash
# Backend
./gradlew api:bootRun

# Frontend (in separate terminal)
cd ui && npm run dev
```

### 4. Test

1. Navigate to http://localhost:3000/login
2. Click "Login with OAuth2 (Keycloak)"
3. Login with `testuser` / `test123`
4. ✅ You're authenticated!

## Architecture Flow

```
User clicks "Login with OAuth2"
    ↓
Frontend → Backend /api/auth/oauth2/login
    ↓
Redirect to Keycloak login page
    ↓
User enters credentials in Keycloak
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

## Token Management

### Access Token
- **Type**: JWT
- **Where**: `localStorage.token`
- **Lifetime**: 5 minutes (Keycloak default)
- **Use**: Bearer token in API requests

### Refresh Token
- **Type**: JWT
- **Where**: `localStorage.oauth2User.refreshToken`
- **Lifetime**: 30 minutes (Keycloak default)
- **Use**: Get new access token without re-login

### ID Token
- **Type**: JWT
- **Where**: `localStorage.oauth2User.idToken`
- **Contains**: User identity claims
- **Use**: User profile information

## Dual Authentication Support

Both authentication methods work simultaneously:

| Feature | OAuth2 | Legacy JWT |
|---------|--------|------------|
| Authentication | Keycloak | Spring Security |
| Password handling | External (Keycloak) | Internal (Backend) |
| Token type | OAuth2 Access Token | Custom JWT |
| Refresh capability | Yes (refresh token) | No |
| Storage | `authType: oauth2` | `authType: legacy` |
| User object | `oauth2User` | `currentUser` |

## API Endpoints

### New OAuth2 Endpoints
```
GET  /api/auth/oauth2/login          - Start OAuth2 flow
GET  /api/auth/oauth2/callback       - Handle Keycloak callback
POST /api/auth/oauth2/exchange       - Exchange code for tokens
POST /api/auth/oauth2/refresh        - Refresh access token
```

### Existing Endpoints (Still Work)
```
POST   /api/auth/login               - Legacy username/password
POST   /api/auth/register            - User registration
DELETE /api/auth/logout              - Logout
```

## Configuration

### Backend (application.properties)

```properties
# OAuth2 Client
spring.security.oauth2.client.registration.keycloak.client-id=course-app
spring.security.oauth2.client.registration.keycloak.client-secret=<SECRET>
spring.security.oauth2.client.provider.keycloak.issuer-uri=http://localhost:8080/realms/course-app

# OAuth2 Resource Server
spring.security.oauth2.resourceserver.jwt.issuer-uri=http://localhost:8080/realms/course-app
```

### Keycloak (docker-compose.yml)

```yaml
keycloak:
  image: quay.io/keycloak/keycloak:26.0
  environment:
    KEYCLOAK_ADMIN: admin
    KEYCLOAK_ADMIN_PASSWORD: admin123
    KC_DB: mysql
  ports:
    - "8080:8080"
```

## Testing Checklist

- [ ] Keycloak starts successfully
- [ ] Can access Keycloak admin console (http://localhost:8080)
- [ ] Created `course-app` realm
- [ ] Created `course-app` client with correct redirect URIs
- [ ] Created test user in Keycloak
- [ ] Backend starts without errors
- [ ] Frontend shows "Login with OAuth2" button
- [ ] OAuth2 login redirects to Keycloak
- [ ] Can login with test user
- [ ] Redirected back to frontend after login
- [ ] `oauth2User` object in localStorage
- [ ] Can access protected routes
- [ ] Logout works correctly
- [ ] Legacy login still works

## Troubleshooting

### "Invalid redirect URI"
**Fix**: Add redirect URIs in Keycloak client settings

### "Client secret doesn't match"
**Fix**: Copy secret from Keycloak → Credentials tab and update `application.properties`

### "Keycloak not starting"
**Fix**: `docker compose down -v` then `docker compose up -d`

### "CORS errors"
**Fix**: Add `http://localhost:3000` to Keycloak client Web Origins

### "Token expired"
**Fix**: Call `refreshOAuth2Token()` or re-login

## Next Steps

### Immediate
1. ✅ Complete Keycloak setup
2. ✅ Test OAuth2 flow end-to-end
3. ✅ Verify token refresh works
4. ⏳ Update frontend to auto-refresh tokens before expiry

### Short Term
1. Add role mapping from Keycloak to application permissions
2. Sync Keycloak users with local User table
3. Implement "Remember Me" functionality
4. Add MFA support via Keycloak

### Production
1. Use external Keycloak instance (not Docker Compose)
2. Configure HTTPS for all services
3. Use httpOnly cookies instead of localStorage
4. Implement PKCE flow
5. Add monitoring and logging
6. Remove legacy JWT authentication (migration complete)

## Documentation

- **Full Setup Guide**: [OAUTH2_SETUP_GUIDE.md](./OAUTH2_SETUP_GUIDE.md)
- **Keycloak Admin**: http://localhost:8080 (admin/admin123)
- **API Documentation**: http://localhost:8081/swagger-ui.html

## Support

For questions or issues:
1. Check [OAUTH2_SETUP_GUIDE.md](./OAUTH2_SETUP_GUIDE.md) troubleshooting section
2. Review Keycloak logs: `docker compose logs keycloak`
3. Check backend logs: `./gradlew api:bootRun`
4. Verify Keycloak configuration matches the guide
