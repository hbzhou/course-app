# OAuth2 Quick Setup Checklist

Complete these steps to enable OAuth2 authentication with Keycloak.

## ☑️ Pre-flight Checklist

- [ ] Docker and Docker Compose installed
- [ ] Ports 8080, 8081, 3000, 3306, 6379 available
- [ ] Gradle and Node.js installed

## 🚀 Setup Steps (15 minutes)

### 1. Start Services

```bash
# Start all containers
docker compose up -d

# Wait for Keycloak (takes 30-60 seconds on first start)
docker compose logs -f keycloak
# Look for: "Keycloak 26.0 started"
```

- [ ] MySQL started
- [ ] Redis started
- [ ] Keycloak started successfully

### 2. Configure Keycloak

#### 2.1 Access Admin Console

```bash
# Open in browser
open http://localhost:8080
```

- [ ] Keycloak admin console accessible
- [ ] Logged in with: `admin` / `admin123`

#### 2.2 Create Realm

1. Click dropdown in top-left (currently "master")
2. Click "Create Realm"
3. Name: `course-app`
4. Click "Create"

- [ ] Realm `course-app` created
- [ ] Currently viewing `course-app` realm (check top-left dropdown)

#### 2.3 Create Client

1. Go to: Clients → Create client
2. **General Settings**:
   - Client type: `OpenID Connect`
   - Client ID: `course-app`
   - Click "Next"
3. **Capability config**:
   - Client authentication: `ON`
   - Authorization: `OFF`
   - Authentication flow: Check ✅ Standard flow, ✅ Direct access grants
   - Click "Next"
4. **Login settings**:
   - Root URL: `http://localhost:3000`
   - Valid redirect URIs:
     - `http://localhost:8081/api/auth/oauth2/callback`
     - `http://localhost:3000/oauth2/callback`
   - Valid post logout redirect URIs: `http://localhost:3000`
   - Web origins: `http://localhost:3000`
   - Click "Save"

- [ ] Client `course-app` created
- [ ] Redirect URIs configured
- [ ] Web origins configured

#### 2.4 Get Client Secret

1. Go to: Clients → course-app → Credentials tab
2. Copy the "Client secret" value
3. Open: `api/src/main/resources/application.properties`
4. Update line:
   ```properties
   spring.security.oauth2.client.registration.keycloak.client-secret=<PASTE_SECRET_HERE>
   ```

Alternative - use environment variable:
```bash
export KEYCLOAK_CLIENT_SECRET=<PASTE_SECRET_HERE>
```

- [ ] Client secret copied
- [ ] application.properties updated OR environment variable set

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
   - Temporary: `OFF`
   - Click "Save"
5. Confirm "Save password"

- [ ] User `testuser` created
- [ ] Password set to `test123`
- [ ] Email marked as verified

### 3. Start Application

#### 3.1 Backend

```bash
# From project root
./gradlew api:bootRun
```

Wait for: `Started CourseApplicationKt in X.XXX seconds`

- [ ] Backend started successfully on port 8081
- [ ] No errors in console
- [ ] Health check: http://localhost:8081/actuator/health

#### 3.2 Frontend

```bash
# In new terminal
cd ui
npm install
npm run dev
```

Wait for: `Local: http://localhost:3000`

- [ ] Frontend started successfully on port 3000
- [ ] No errors in console
- [ ] Can access http://localhost:3000

### 4. Test OAuth2 Login

1. Navigate to: http://localhost:3000/login
2. You should see:
   - [ ] "Login with OAuth2 (Keycloak)" button
   - [ ] Traditional username/password form below

3. Click "Login with OAuth2 (Keycloak)"
4. You should be redirected to Keycloak login page
   - [ ] Keycloak login page displays
   - [ ] URL contains `localhost:8080/realms/course-app`

5. Enter credentials:
   - Username: `testuser`
   - Password: `test123`
6. Click "Sign in"
7. You should be redirected back to the app
   - [ ] Redirected to http://localhost:3000/courses
   - [ ] User is logged in
   - [ ] Can see user profile icon in header

8. Verify tokens in browser DevTools:
   - Open: DevTools → Application → Local Storage → http://localhost:3000
   - [ ] `oauth2User` exists (contains user info and tokens)
   - [ ] `token` exists (contains access token)
   - [ ] `authType` = "oauth2"

9. Test functionality:
   - [ ] Can view courses
   - [ ] Can navigate to other pages
   - [ ] Real-time notifications work (create/edit something)
   - [ ] Logout works

### 5. Test Legacy Login (Optional)

1. Logout if logged in
2. Go to: http://localhost:3000/login
3. Use traditional form:
   - Username: `admin`
   - Password: `admin123`
4. Click "Login" (not the OAuth2 button)
5. Should be logged in
   - [ ] Redirected to courses
   - [ ] `authType` = "legacy" in localStorage
   - [ ] Traditional JWT authentication works

## ✅ Success Criteria

All of these should be true:

- ✅ Keycloak admin console accessible
- ✅ Realm and client configured
- ✅ Test user created
- ✅ Backend running without errors
- ✅ Frontend running without errors
- ✅ OAuth2 login button visible
- ✅ Can login with OAuth2 flow
- ✅ Tokens stored in localStorage
- ✅ Can access protected routes
- ✅ Logout works
- ✅ Legacy login still works

## 🔧 Troubleshooting

### Keycloak not starting

```bash
# Check logs
docker compose logs keycloak

# If database issues, reset everything
docker compose down -v
docker compose up -d
```

### Invalid redirect_uri error

- Verify redirect URIs in Keycloak client settings exactly match:
  - `http://localhost:8081/api/auth/oauth2/callback`
  - `http://localhost:3000/oauth2/callback`

### Client secret error

- Copy the EXACT secret from Keycloak Credentials tab
- No extra spaces or newlines
- Update application.properties or set environment variable

### CORS errors

- Add `http://localhost:3000` to Web origins in Keycloak client

### Can't login to Keycloak admin

- Default credentials: `admin` / `admin123`
- Set in docker-compose.yml under `KEYCLOAK_ADMIN` and `KEYCLOAK_ADMIN_PASSWORD`

### OAuth2 callback shows error

- Check browser console for errors
- Check backend logs for exceptions
- Verify client secret matches
- Ensure test user has email verified

## 📚 Next Steps

Once OAuth2 is working:

1. **Read full documentation**:
   - [OAuth2 Setup Guide](./OAUTH2_SETUP_GUIDE.md) - Complete reference
   - [Migration Summary](./OAUTH2_MIGRATION_SUMMARY.md) - Overview of changes

2. **Configure roles** (optional):
   - Create realm roles in Keycloak
   - Assign roles to users
   - Update application to use Keycloak roles

3. **Production setup**:
   - Use external Keycloak (not Docker Compose)
   - Configure HTTPS
   - Use httpOnly cookies instead of localStorage
   - Implement token auto-refresh

4. **Advanced features**:
   - Social login (Google, GitHub)
   - Multi-factor authentication
   - User federation (LDAP, Active Directory)
   - Custom themes

## 💡 Tips

- **Keycloak realm export**: Export your configured realm for backup
- **Environment variables**: Use `.env` file for secrets (don't commit!)
- **Token debugging**: Use https://jwt.io to decode JWT tokens
- **Browser DevTools**: Check Network tab for OAuth2 redirects and requests
- **Keep Keycloak updated**: Latest version has security fixes

## ⏱️ Time Estimate

- Keycloak setup: 5-7 minutes
- Backend config: 2 minutes
- Testing: 3-5 minutes
- **Total: ~15 minutes**

## 🎯 Quick Reference

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Frontend | http://localhost:3000 | - |
| Backend API | http://localhost:8081 | - |
| Keycloak Admin | http://localhost:8080 | admin / admin123 |
| MySQL | localhost:3306 | admin / welcome123 |
| Redis | localhost:6379 | (no auth) |

| Login Method | Username | Password |
|--------------|----------|----------|
| OAuth2 (Keycloak) | testuser | test123 |
| Legacy JWT | admin | admin123 |
