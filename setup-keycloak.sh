#!/usr/bin/env bash
set -euo pipefail

KEYCLOAK_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASS="admin123"
REALM="course-app"
CLIENT_ID="course-app"
CLIENT_SECRET="course-app-secret"

echo "==> Getting admin token..."
TOKEN=$(curl -sf -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${ADMIN_USER}&password=${ADMIN_PASS}&grant_type=password&client_id=admin-cli" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "==> Checking if realm '${REALM}' exists..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${TOKEN}" \
  "${KEYCLOAK_URL}/admin/realms/${REALM}")

if [ "$STATUS" = "200" ]; then
  echo "    Realm '${REALM}' already exists, skipping creation."
else
  echo "==> Creating realm '${REALM}'..."
  cat > /tmp/kc-realm.json <<EOF
{
  "realm": "${REALM}",
  "displayName": "Course App",
  "enabled": true,
  "registrationAllowed": false,
  "loginWithEmailAllowed": true,
  "duplicateEmailsAllowed": false,
  "resetPasswordAllowed": true,
  "editUsernameAllowed": false,
  "bruteForceProtected": false
}
EOF
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${KEYCLOAK_URL}/admin/realms" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/kc-realm.json)
  echo "    HTTP ${HTTP}"
  [ "$HTTP" = "201" ] || { echo "ERROR: Failed to create realm"; exit 1; }
fi

echo "==> Refreshing admin token for realm operations..."
TOKEN=$(curl -sf -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${ADMIN_USER}&password=${ADMIN_PASS}&grant_type=password&client_id=admin-cli" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "==> Checking if client '${CLIENT_ID}' exists..."
EXISTING=$(curl -s \
  -H "Authorization: Bearer ${TOKEN}" \
  "${KEYCLOAK_URL}/admin/realms/${REALM}/clients?clientId=${CLIENT_ID}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')")

if [ -n "$EXISTING" ]; then
  echo "    Client '${CLIENT_ID}' already exists (id=${EXISTING}), skipping creation."
else
  echo "==> Creating client '${CLIENT_ID}'..."
  cat > /tmp/kc-client.json <<EOF
{
  "clientId": "${CLIENT_ID}",
  "name": "Course App",
  "enabled": true,
  "clientAuthenticatorType": "client-secret",
  "secret": "${CLIENT_SECRET}",
  "publicClient": false,
  "standardFlowEnabled": true,
  "directAccessGrantsEnabled": true,
  "serviceAccountsEnabled": false,
  "protocol": "openid-connect",
  "redirectUris": ["http://localhost:8081/*", "http://localhost:3000/*"],
  "webOrigins": ["http://localhost:8081", "http://localhost:3000"],
  "attributes": {
    "post.logout.redirect.uris": "http://localhost:3000/*##http://localhost:8081/*"
  }
}
EOF
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/clients" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/kc-client.json)
  echo "    HTTP ${HTTP}"
  [ "$HTTP" = "201" ] || { echo "ERROR: Failed to create client"; exit 1; }
fi

echo "==> Refreshing token..."
TOKEN=$(curl -sf -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${ADMIN_USER}&password=${ADMIN_PASS}&grant_type=password&client_id=admin-cli" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "==> Creating realm roles: ROLE_ADMIN, ROLE_USER..."
for ROLE in ROLE_ADMIN ROLE_USER; do
  cat > /tmp/kc-role.json <<EOF
{"name": "${ROLE}", "description": "${ROLE} role"}
EOF
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "${KEYCLOAK_URL}/admin/realms/${REALM}/roles" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/kc-role.json)
  echo "    ${ROLE}: HTTP ${HTTP}"
done

echo "==> Creating default admin user (admin / admin123)..."
cat > /tmp/kc-user.json <<EOF
{
  "username": "admin",
  "email": "admin@course-app.local",
  "firstName": "Admin",
  "lastName": "User",
  "enabled": true,
  "emailVerified": true,
  "credentials": [{"type":"password","value":"admin123","temporary":false}],
  "realmRoles": ["ROLE_ADMIN"]
}
EOF
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "${KEYCLOAK_URL}/admin/realms/${REALM}/users" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d @/tmp/kc-user.json)
echo "    admin user: HTTP ${HTTP}"

echo "==> Assigning ROLE_ADMIN to admin user..."
TOKEN=$(curl -sf -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${ADMIN_USER}&password=${ADMIN_PASS}&grant_type=password&client_id=admin-cli" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

USER_ID=$(curl -s \
  -H "Authorization: Bearer ${TOKEN}" \
  "${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=admin&exact=true" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')")

ROLE_REP=$(curl -s \
  -H "Authorization: Bearer ${TOKEN}" \
  "${KEYCLOAK_URL}/admin/realms/${REALM}/roles/ROLE_ADMIN")

HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "${KEYCLOAK_URL}/admin/realms/${REALM}/users/${USER_ID}/role-mappings/realm" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "[${ROLE_REP}]")
echo "    role assignment: HTTP ${HTTP}"

echo ""
echo "✅  Keycloak setup complete!"
echo "    Realm:         ${KEYCLOAK_URL}/realms/${REALM}"
echo "    Admin console: ${KEYCLOAK_URL}/admin"
echo "    Client ID:     ${CLIENT_ID}"
echo "    Client Secret: ${CLIENT_SECRET}"
echo "    Test user:     admin / admin123  (ROLE_ADMIN)"

