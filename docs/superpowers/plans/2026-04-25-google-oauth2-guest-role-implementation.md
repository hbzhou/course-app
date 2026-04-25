# Google OAuth2 Guest Role Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth2 login support, accept only Gmail identities, and assign `ROLE_GUEST` read-only permissions (`COURSE_VIEW`, `TAG_VIEW`, `AUTHOR_VIEW`) while keeping existing providers working.

**Architecture:** Extend the current provider-aware OAuth2 normalization pipeline with a Google claims adapter and provider-level default-role support. Keep authority mapping centralized in `OAuth2AuthorityMapper`, add provider metadata in configuration, and enforce Gmail domain validation in the Google adapter before authority assignment. Persist `ROLE_GUEST` and `AUTHOR_VIEW` through a new Flyway migration.

**Tech Stack:** Kotlin 2.3, Spring Boot 4, Spring Security OAuth2 Client/Resource Server, Flyway, JUnit 5, AssertJ, MockMvc

---

## File Map

**Create**
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/GoogleClaimsAdapter.kt`
- `api/src/test/kotlin/com/itsz/app/auth/oauth2/GoogleClaimsAdapterTest.kt`
- `api/src/main/resources/db/migration/V5__add_role_guest_and_author_view_permission.sql`

**Modify**
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2ProviderProfile.kt`
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2AuthorityMapper.kt`
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/ProviderAwareOidcUserService.kt`
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/ProviderAwareJwtAuthenticationConverter.kt`
- `api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt`
- `api/src/main/resources/application.properties`
- `api/src/test/kotlin/com/itsz/app/auth/oauth2/OAuth2AuthorityMapperTest.kt`
- `api/src/test/kotlin/com/itsz/app/auth/oauth2/ProviderAwareOidcUserServiceTest.kt`

---

### Task 1: Add Provider-Level Default Role Contract

**Files:**
- Modify: `api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2ProviderProfile.kt`
- Modify: `api/src/test/kotlin/com/itsz/app/auth/oauth2/OAuth2AuthorityMapperTest.kt`

- [ ] **Step 1: Write failing test for provider-specific fallback role**

```kotlin
@Test
fun `uses provider default role when normalized roles are empty`() {
    val principal = NormalizedOAuth2Principal(
        provider = "google",
        subject = "google-subject",
        username = "guest.user@gmail.com",
        email = "guest.user@gmail.com",
        groupsOrRoles = emptyList(),
        rawClaims = emptyMap()
    )
    val profile = OAuth2ProviderProfile(
        providerId = "google",
        displayName = "Google",
        issuerUri = "https://accounts.google.com",
        defaultRole = "ROLE_GUEST"
    )

    val mapped = OAuth2AuthorityMapper().map(normalized = principal, profile = profile)

    assertThat(mapped.map { it.authority }).contains("ROLE_GUEST", "COURSE_VIEW", "TAG_VIEW", "AUTHOR_VIEW")
}
```

- [ ] **Step 2: Run targeted test to confirm method/field do not exist yet**

Run: `./gradlew api:test --tests com.itsz.app.auth.oauth2.OAuth2AuthorityMapperTest`

Expected: FAIL with compile errors for missing `defaultRole` and/or `map(..., profile=...)` signature.

- [ ] **Step 3: Add `defaultRole` to provider profile**

```kotlin
data class OAuth2ProviderProfile(
    val providerId: String,
    val displayName: String,
    val issuerUri: String,
    val usernameClaims: List<String> = emptyList(),
    val emailClaims: List<String> = emptyList(),
    val roleClaims: List<String> = emptyList(),
    val defaultRole: String? = null
)
```

- [ ] **Step 4: Update mapper to use provider fallback role**

```kotlin
class OAuth2AuthorityMapper {
    private val roleToPermissionsMap = mapOf(
        "ROLE_ADMIN" to setOf("COURSE_VIEW", "COURSE_EDIT", "TAG_VIEW", "TAG_EDIT", "USER_MANAGE", "ROLE_MANAGE", "AUTHOR_VIEW"),
        "ROLE_USER" to setOf("COURSE_VIEW", "TAG_VIEW"),
        "ROLE_GUEST" to setOf("COURSE_VIEW", "TAG_VIEW", "AUTHOR_VIEW")
    )

    private val globalDefaultRole = "ROLE_USER"

    fun map(
        normalized: NormalizedOAuth2Principal,
        profile: OAuth2ProviderProfile,
        baseAuthorities: Collection<GrantedAuthority> = emptyList()
    ): Set<GrantedAuthority> {
        val authorities = linkedSetOf<GrantedAuthority>()
        authorities.addAll(baseAuthorities)

        val roles = normalized.groupsOrRoles.ifEmpty {
            listOf(profile.defaultRole ?: globalDefaultRole)
        }

        roles.forEach { role ->
            authorities.add(SimpleGrantedAuthority(role))
            roleToPermissionsMap[role]?.forEach { permission ->
                authorities.add(SimpleGrantedAuthority(permission))
            }
        }

        return authorities
    }
}
```

- [ ] **Step 5: Re-run targeted test**

Run: `./gradlew api:test --tests com.itsz.app.auth.oauth2.OAuth2AuthorityMapperTest`

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2ProviderProfile.kt \
  api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2AuthorityMapper.kt \
  api/src/test/kotlin/com/itsz/app/auth/oauth2/OAuth2AuthorityMapperTest.kt
git commit -m "feat(auth): add provider-level oauth2 default role mapping"
```

---

### Task 2: Implement Google Claims Adapter With Gmail Validation

**Files:**
- Create: `api/src/main/kotlin/com/itsz/app/auth/oauth2/GoogleClaimsAdapter.kt`
- Create: `api/src/test/kotlin/com/itsz/app/auth/oauth2/GoogleClaimsAdapterTest.kt`

- [ ] **Step 1: Write failing tests for normalization and Gmail validation**

```kotlin
class GoogleClaimsAdapterTest {
    private val profile = OAuth2ProviderProfile(
        providerId = "google",
        displayName = "Google",
        issuerUri = "https://accounts.google.com",
        usernameClaims = listOf("name", "email", "sub"),
        emailClaims = listOf("email"),
        defaultRole = "ROLE_GUEST"
    )

    @Test
    fun `normalizes google claims with empty groups or roles`() {
        val principal = GoogleClaimsAdapter().normalize(
            mapOf("sub" to "sub-123", "name" to "Guest User", "email" to "guest.user@gmail.com"),
            profile
        )

        assertThat(principal.provider).isEqualTo("google")
        assertThat(principal.username).isEqualTo("Guest User")
        assertThat(principal.email).isEqualTo("guest.user@gmail.com")
        assertThat(principal.groupsOrRoles).isEmpty()
    }

    @Test
    fun `rejects non gmail domains`() {
        assertThatThrownBy {
            GoogleClaimsAdapter().normalize(
                mapOf("sub" to "sub-123", "email" to "guest@company.com"),
                profile
            )
        }.isInstanceOf(IllegalArgumentException::class.java)
            .hasMessageContaining("gmail.com")
    }
}
```

- [ ] **Step 2: Run targeted test and confirm failures**

Run: `./gradlew api:test --tests com.itsz.app.auth.oauth2.GoogleClaimsAdapterTest`

Expected: FAIL because `GoogleClaimsAdapter` is missing.

- [ ] **Step 3: Implement adapter**

```kotlin
class GoogleClaimsAdapter : OAuth2ClaimsAdapter {
    override val providerId: String = "google"

    override fun normalize(claims: Map<String, Any?>, profile: OAuth2ProviderProfile): NormalizedOAuth2Principal {
        val email = (claims["email"] as? String)?.trim()
            ?: throw IllegalArgumentException("Google login requires email claim")

        if (!email.endsWith("@gmail.com", ignoreCase = true)) {
            throw IllegalArgumentException("Google login is restricted to gmail.com addresses")
        }

        val username = profile.usernameClaims
            .firstNotNullOfOrNull { claim -> claims[claim] as? String }
            ?: claims["sub"].toString()

        return NormalizedOAuth2Principal(
            provider = providerId,
            subject = claims["sub"].toString(),
            username = username,
            email = email,
            groupsOrRoles = emptyList(),
            rawClaims = claims
        )
    }
}
```

- [ ] **Step 4: Re-run targeted test**

Run: `./gradlew api:test --tests com.itsz.app.auth.oauth2.GoogleClaimsAdapterTest`

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add api/src/main/kotlin/com/itsz/app/auth/oauth2/GoogleClaimsAdapter.kt \
  api/src/test/kotlin/com/itsz/app/auth/oauth2/GoogleClaimsAdapterTest.kt
git commit -m "feat(auth): add google claims adapter with gmail validation"
```

---

### Task 3: Wire Google Provider Through OAuth2 Pipeline

**Files:**
- Modify: `api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt`
- Modify: `api/src/main/kotlin/com/itsz/app/auth/oauth2/ProviderAwareOidcUserService.kt`
- Modify: `api/src/main/kotlin/com/itsz/app/auth/oauth2/ProviderAwareJwtAuthenticationConverter.kt`
- Modify: `api/src/main/resources/application.properties`
- Modify: `api/src/test/kotlin/com/itsz/app/auth/oauth2/ProviderAwareOidcUserServiceTest.kt`

- [ ] **Step 1: Add failing provider-aware OIDC test for Google default role fallback**

```kotlin
@Test
fun `applies google default role when google claims contain no roles`() {
    val now = Instant.now()
    val registration = ClientRegistration.withRegistrationId("google")
        .clientId("google-client")
        .clientSecret("secret")
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
        .redirectUri("http://localhost/login/oauth2/code/google")
        .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
        .tokenUri("https://oauth2.googleapis.com/token")
        .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
        .issuerUri("https://accounts.google.com")
        .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo")
        .userNameAttributeName("email")
        .build()

    val request = OidcUserRequest(
        registration,
        OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "access-token", now, now.plusSeconds(300)),
        OidcIdToken("id-token", now, now.plusSeconds(300), mapOf("sub" to "g-1", "email" to "guest.user@gmail.com"))
    )

    val delegateUser = DefaultOidcUser(
        listOf(SimpleGrantedAuthority("OIDC_USER")),
        request.idToken,
        OidcUserInfo(mapOf("email" to "guest.user@gmail.com", "name" to "Guest User")),
        "email"
    )

    val service = ProviderAwareOidcUserService(
        providerResolver = OAuth2ProviderResolver(
            defaultProvider = "google",
            profiles = listOf(
                OAuth2ProviderProfile(
                    providerId = "google",
                    displayName = "Google",
                    issuerUri = "https://accounts.google.com",
                    usernameClaims = listOf("name", "email", "sub"),
                    emailClaims = listOf("email"),
                    defaultRole = "ROLE_GUEST"
                )
            )
        ),
        adapters = listOf(GoogleClaimsAdapter()).associateBy { it.providerId },
        authorityMapper = OAuth2AuthorityMapper(),
        delegate = OAuth2UserService<OidcUserRequest, OidcUser> { delegateUser },
        accessTokenClaimsLoader = { emptyMap() }
    )

    val loadedUser = service.loadUser(request)

    assertThat(loadedUser.getAttribute<String>("provider")).isEqualTo("google")
    assertThat(loadedUser.authorities.map { it.authority })
        .contains("ROLE_GUEST", "COURSE_VIEW", "TAG_VIEW", "AUTHOR_VIEW")
}
```

- [ ] **Step 2: Run targeted OIDC service test and confirm failure**

Run: `./gradlew api:test --tests com.itsz.app.auth.oauth2.ProviderAwareOidcUserServiceTest`

Expected: FAIL due to mapper signature mismatch and missing Google adapter wiring.

- [ ] **Step 3: Update OIDC service to pass provider profile into mapper**

```kotlin
val profile = providerResolver.requireByRegistrationId(userRequest.clientRegistration.registrationId)
val normalized = adapters.getValue(profile.providerId).normalize(mergedClaims, profile)
val mappedAuthorities = authorityMapper.map(normalized, profile, oidcUser.authorities)
```

- [ ] **Step 4: Update JWT converter to pass resolved profile into mapper**

```kotlin
val profile = providerResolver.findByIssuer(jwt.issuer?.toString()) ?: providerResolver.defaultProfile()
val normalized = adapters.getValue(profile.providerId).normalize(jwt.claims, profile)
val authorities = authorityMapper.map(normalized, profile, delegateAuthorities)
```

- [ ] **Step 5: Register Google adapter in security config adapter map**

```kotlin
@Bean
fun oauth2ClaimsAdapters(): Map<String, OAuth2ClaimsAdapter> =
    listOf(AzureAdClaimsAdapter(), KeycloakClaimsAdapter(), GoogleClaimsAdapter())
        .associateBy { it.providerId }
```

- [ ] **Step 6: Add Google OAuth2 provider/registration properties**

```properties
app.oauth2.providers[2].provider-id=google
app.oauth2.providers[2].display-name=Google
app.oauth2.providers[2].issuer-uri=https://accounts.google.com
app.oauth2.providers[2].username-claims=name,email,sub
app.oauth2.providers[2].email-claims=email
app.oauth2.providers[2].role-claims=
app.oauth2.providers[2].default-role=ROLE_GUEST

spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID:}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET:}
spring.security.oauth2.client.registration.google.authorization-grant-type=authorization_code
spring.security.oauth2.client.registration.google.redirect-uri={baseUrl}/login/oauth2/code/{registrationId}
spring.security.oauth2.client.registration.google.scope=openid,profile,email

spring.security.oauth2.client.provider.google.issuer-uri=https://accounts.google.com
spring.security.oauth2.client.provider.google.authorization-uri=https://accounts.google.com/o/oauth2/v2/auth
spring.security.oauth2.client.provider.google.token-uri=https://oauth2.googleapis.com/token
spring.security.oauth2.client.provider.google.user-info-uri=https://openidconnect.googleapis.com/v1/userinfo
spring.security.oauth2.client.provider.google.jwk-set-uri=https://www.googleapis.com/oauth2/v3/certs
spring.security.oauth2.client.provider.google.user-name-attribute=email
```

- [ ] **Step 7: Re-run targeted tests**

Run: `./gradlew api:test --tests com.itsz.app.auth.oauth2.ProviderAwareOidcUserServiceTest --tests com.itsz.app.auth.oauth2.OAuth2AuthorityMapperTest --tests com.itsz.app.auth.oauth2.GoogleClaimsAdapterTest`

Expected: PASS.

- [ ] **Step 8: Commit Task 3**

```bash
git add api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt \
  api/src/main/kotlin/com/itsz/app/auth/oauth2/ProviderAwareOidcUserService.kt \
  api/src/main/kotlin/com/itsz/app/auth/oauth2/ProviderAwareJwtAuthenticationConverter.kt \
  api/src/main/resources/application.properties \
  api/src/test/kotlin/com/itsz/app/auth/oauth2/ProviderAwareOidcUserServiceTest.kt
git commit -m "feat(auth): wire google oauth2 provider through normalization pipeline"
```

---

### Task 4: Add DB Permissions for Guest Read Scope

**Files:**
- Create: `api/src/main/resources/db/migration/V5__add_role_guest_and_author_view_permission.sql`

- [ ] **Step 1: Write migration with insert-if-not-exists semantics**

```sql
INSERT INTO role (name)
SELECT 'ROLE_GUEST'
WHERE NOT EXISTS (SELECT 1 FROM role WHERE name = 'ROLE_GUEST');

INSERT INTO permission (name)
SELECT 'AUTHOR_VIEW'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE name = 'AUTHOR_VIEW');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.name IN ('COURSE_VIEW', 'TAG_VIEW', 'AUTHOR_VIEW')
WHERE r.name = 'ROLE_GUEST'
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.name = 'AUTHOR_VIEW'
WHERE r.name = 'ROLE_ADMIN'
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
```

- [ ] **Step 2: Run backend startup tests that exercise Flyway**

Run: `./gradlew api:test --tests com.itsz.app.CousrseApplicationTests`

Expected: PASS and Flyway applies migration successfully in test context.

- [ ] **Step 3: Commit Task 4**

```bash
git add api/src/main/resources/db/migration/V5__add_role_guest_and_author_view_permission.sql
git commit -m "feat(db): add role guest and author view permission mapping"
```

---

### Task 5: End-to-End Auth Behavior Verification

**Files:**
- Modify: `api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerProvidersTest.kt`
- Modify: `api/src/test/kotlin/com/itsz/app/auth/oauth2/ProviderAwareOidcUserServiceTest.kt`

- [ ] **Step 1: Add failing providers endpoint test to include Google**

```kotlin
@Test
fun `providers endpoint includes google`() {
    mockMvc.get("/api/auth/providers")
        .andExpect {
            status { isOk() }
            jsonPath("$[2].providerId") { value("google") }
            jsonPath("$[2].displayName") { value("Google") }
        }
}
```

- [ ] **Step 2: Add failing test for non-gmail rejection in OIDC service**

```kotlin
@Test
fun `rejects google identities outside gmail domain`() {
    val now = Instant.now()
    val registration = ClientRegistration.withRegistrationId("google")
        .clientId("google-client")
        .clientSecret("secret")
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
        .redirectUri("http://localhost/login/oauth2/code/google")
        .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
        .tokenUri("https://oauth2.googleapis.com/token")
        .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
        .issuerUri("https://accounts.google.com")
        .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo")
        .userNameAttributeName("email")
        .build()

    val request = OidcUserRequest(
        registration,
        OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "access-token", now, now.plusSeconds(300)),
        OidcIdToken("id-token", now, now.plusSeconds(300), mapOf("sub" to "g-2", "email" to "guest@company.com"))
    )

    val delegateUser = DefaultOidcUser(
        listOf(SimpleGrantedAuthority("OIDC_USER")),
        request.idToken,
        OidcUserInfo(mapOf("email" to "guest@company.com", "name" to "Guest User")),
        "email"
    )

    val service = ProviderAwareOidcUserService(
        providerResolver = OAuth2ProviderResolver(
            defaultProvider = "google",
            profiles = listOf(
                OAuth2ProviderProfile(
                    providerId = "google",
                    displayName = "Google",
                    issuerUri = "https://accounts.google.com",
                    usernameClaims = listOf("name", "email", "sub"),
                    emailClaims = listOf("email"),
                    defaultRole = "ROLE_GUEST"
                )
            )
        ),
        adapters = listOf(GoogleClaimsAdapter()).associateBy { it.providerId },
        authorityMapper = OAuth2AuthorityMapper(),
        delegate = OAuth2UserService<OidcUserRequest, OidcUser> { delegateUser },
        accessTokenClaimsLoader = { emptyMap() }
    )

    assertThatThrownBy { service.loadUser(request) }
        .isInstanceOf(IllegalArgumentException::class.java)
        .hasMessageContaining("gmail.com")
}
```

- [ ] **Step 3: Run both targeted tests and verify pass after prior tasks**

Run: `./gradlew api:test --tests com.itsz.app.auth.controller.AuthControllerProvidersTest --tests com.itsz.app.auth.oauth2.ProviderAwareOidcUserServiceTest`

Expected: PASS.

- [ ] **Step 4: Run full backend test suite**

Run: `./gradlew api:test`

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

```bash
git add api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerProvidersTest.kt \
  api/src/test/kotlin/com/itsz/app/auth/oauth2/ProviderAwareOidcUserServiceTest.kt
git commit -m "test(auth): verify google provider listing and gmail-only enforcement"
```

---

### Task 6: Local Verification and Operational Setup

**Files:**
- Modify: `api/src/main/resources/application.properties` (if final env var defaults need adjustment)

- [ ] **Step 1: Configure local Google client credentials in shell**

Run:

```bash
export GOOGLE_CLIENT_ID="<google-client-id>"
export GOOGLE_CLIENT_SECRET="<google-client-secret>"
```

Expected: env vars available for app startup.

- [ ] **Step 2: Start backend and verify OAuth2 provider list contains Google**

Run: `./gradlew api:bootRun`

Then in separate terminal:

Run: `curl -s http://localhost:8081/api/auth/providers | jq .`

Expected output contains an entry with `providerId` = `google` and `displayName` = `Google`.

- [ ] **Step 3: Perform manual browser login flow**

Run in browser:
- Open `http://localhost:3000`
- Click OAuth2 login button
- Choose Google account with `@gmail.com`
- Verify post-login route is `/courses`
- Verify read-only behavior in UI (view pages work, edit actions denied)

Expected:
- Login succeeds for Gmail.
- Non-Gmail Google account is denied.

- [ ] **Step 4: Commit final operational tuning (only if changed)**

```bash
git add api/src/main/resources/application.properties
git commit -m "chore(auth): finalize local google oauth2 configuration"
```

---

## Final Verification Checklist

- [ ] `./gradlew api:test` passes.
- [ ] `./gradlew api:bootRun` starts with Google credentials set.
- [ ] `/api/auth/providers` returns Google entry.
- [ ] Gmail login produces `ROLE_GUEST` authorities.
- [ ] Guest has `COURSE_VIEW`, `TAG_VIEW`, `AUTHOR_VIEW` only.
- [ ] Existing Keycloak and legacy login flows still function.
