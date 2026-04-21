# Multi-Provider OAuth2 (Azure AD First) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the remaining Keycloak-specific OAuth2 plumbing with provider-agnostic contracts, add Azure AD as the default session-based OAuth2 provider, and keep legacy username/password plus Keycloak compatibility working during migration.

**Architecture:** Introduce a small backend provider abstraction layer that normalizes provider claims into one internal principal shape, then use that normalized shape everywhere Spring Security, `/api/auth/me`, and WebSocket auth need provider-specific behavior. On the frontend, keep the current session-first model, switch the login button to configuration-driven provider metadata, and treat OAuth2 users as `session` auth rather than browser-held OAuth2 tokens.

**Tech Stack:** Spring Boot 4, Spring Security OAuth2 Client, Spring Security Resource Server, Kotlin 2.3, React 19, TypeScript, React Query v5, Vitest

---

## File Map

**Backend create**
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2ProviderProfile.kt` — provider metadata used by resolver and adapters.
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/NormalizedOAuth2Principal.kt` — normalized internal principal shape plus attribute export helper.
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2ClaimsAdapter.kt` — contract for provider-specific claim normalization.
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/AzureAdClaimsAdapter.kt` — Azure AD claim precedence and role extraction.
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/KeycloakClaimsAdapter.kt` — Keycloak compatibility claim normalization.
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2ProviderResolver.kt` — allow-list and default-provider resolution.
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2AuthorityMapper.kt` — normalized role/group to app-permission mapping.
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/ProviderAwareOidcUserService.kt` — provider-aware OIDC user loading and normalization.
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/ProviderAwareJwtAuthenticationConverter.kt` — issuer-aware JWT normalization for bearer compatibility.
- `api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2ProviderProperties.kt` — `app.oauth2.*` configuration binding.
- `api/src/test/kotlin/com/itsz/app/auth/oauth2/AzureAdClaimsAdapterTest.kt`
- `api/src/test/kotlin/com/itsz/app/auth/oauth2/KeycloakClaimsAdapterTest.kt`
- `api/src/test/kotlin/com/itsz/app/auth/oauth2/OAuth2ProviderResolverTest.kt`
- `api/src/test/kotlin/com/itsz/app/auth/oauth2/OAuth2AuthorityMapperTest.kt`
- `api/src/test/kotlin/com/itsz/app/auth/oauth2/ProviderAwareOidcUserServiceTest.kt`
- `api/src/test/kotlin/com/itsz/app/config/WebSocketAuthChannelInterceptorTest.kt`
- `ui/src/config/oauth2.ts` — frontend provider label and authorization URL helpers.

**Backend modify**
- `api/src/main/resources/application.properties` — add Azure client/provider settings and default-provider properties.
- `api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt` — swap Keycloak-specific beans for provider-aware beans and configurable entrypoint.
- `api/src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt` — return normalized session user fields from `/api/auth/me`.
- `api/src/main/kotlin/com/itsz/app/config/WebSocketAuthChannelInterceptor.kt` — prefer existing session principal and use provider-aware JWT converter for bearer fallback.
- `api/src/test/kotlin/com/itsz/app/config/SecurityConfigSessionAuthTest.kt` — change redirect expectation to default provider and verify mapped permissions still work.
- `api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerSessionTest.kt` — assert normalized session payload uses `authType=session` and includes provider.
- `api/src/test/kotlin/com/itsz/app/config/TestSecurityConfigDisabler.kt` — replace mocked Keycloak beans with provider-aware bean mocks.

**Backend delete**
- `api/src/main/kotlin/com/itsz/app/config/KeycloakOidcUserService.kt`
- `api/src/main/kotlin/com/itsz/app/config/KeycloakAuthorityMapper.kt`
- `api/src/main/kotlin/com/itsz/app/config/KeycloakJwtAuthenticationConverter.kt`
- `api/src/test/kotlin/com/itsz/app/config/KeycloakOidcUserServiceTest.kt`

**Frontend modify**
- `ui/src/api/authApi.ts` — add `provider` to current-user payload and narrow session auth type.
- `ui/src/context/auth-context.ts` — add provider to authenticated session users.
- `ui/src/context/AuthContext.tsx` — keep legacy token persistence but treat backend session users as normalized auth state.
- `ui/src/pages/auth/Login.tsx` — compute provider-aware button label and redirect target.
- `ui/src/pages/auth/__tests__/Login.test.tsx` — assert Azure default label and configurable authorization path.
- `ui/src/context/__tests__/AuthContext.test.tsx` — assert session bootstrap with `authType=session` and provider.
- `ui/src/hooks/useWebSocket.ts` — keep cookie-first session connect and bearer header only for legacy token.
- `ui/src/hooks/__tests__/useWebSocket.test.tsx` — update session auth assertion from `oauth2` to `session`.

**Docs modify**
- `README.md` — document Azure default provider, Keycloak compatibility, and server-side session behavior.
- `OAUTH2_SETUP_GUIDE.md` — add Azure setup and note `app.oauth2.default-provider`.

---

### Task 1: Build Provider-Normalization Contracts First

**Files:**
- Create: `api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2ProviderProfile.kt`
- Create: `api/src/main/kotlin/com/itsz/app/auth/oauth2/NormalizedOAuth2Principal.kt`
- Create: `api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2ClaimsAdapter.kt`
- Create: `api/src/main/kotlin/com/itsz/app/auth/oauth2/AzureAdClaimsAdapter.kt`
- Create: `api/src/main/kotlin/com/itsz/app/auth/oauth2/KeycloakClaimsAdapter.kt`
- Create: `api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2ProviderResolver.kt`
- Create: `api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2AuthorityMapper.kt`
- Create: `api/src/test/kotlin/com/itsz/app/auth/oauth2/AzureAdClaimsAdapterTest.kt`
- Create: `api/src/test/kotlin/com/itsz/app/auth/oauth2/KeycloakClaimsAdapterTest.kt`
- Create: `api/src/test/kotlin/com/itsz/app/auth/oauth2/OAuth2ProviderResolverTest.kt`
- Create: `api/src/test/kotlin/com/itsz/app/auth/oauth2/OAuth2AuthorityMapperTest.kt`

- [ ] **Step 1: Write the failing normalization tests**

```kotlin
package com.itsz.app.auth.oauth2

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class AzureAdClaimsAdapterTest {

    private val profile = OAuth2ProviderProfile(
        providerId = "azure",
        displayName = "Azure AD",
        issuerUri = "https://login.microsoftonline.com/test-tenant/v2.0",
        usernameClaims = listOf("preferred_username", "upn", "email", "sub"),
        emailClaims = listOf("email", "preferred_username", "upn"),
        roleClaims = listOf("roles", "groups")
    )

    @Test
    fun `normalizes azure claims using configured precedence`() {
        val principal = AzureAdClaimsAdapter().normalize(
            mapOf(
                "sub" to "azure-subject",
                "preferred_username" to "azure.user@contoso.com",
                "roles" to listOf("admin")
            ),
            profile
        )

        assertThat(principal.provider).isEqualTo("azure")
        assertThat(principal.username).isEqualTo("azure.user@contoso.com")
        assertThat(principal.email).isEqualTo("azure.user@contoso.com")
        assertThat(principal.groupsOrRoles).containsExactly("ROLE_ADMIN")
    }
}
```

```kotlin
package com.itsz.app.auth.oauth2

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class OAuth2ProviderResolverTest {

    @Test
    fun `returns configured default provider when no provider is requested`() {
        val resolver = OAuth2ProviderResolver(
            defaultProvider = "azure",
            profiles = listOf(
                OAuth2ProviderProfile("azure", "Azure AD", "https://issuer/azure"),
                OAuth2ProviderProfile("keycloak", "Keycloak", "https://issuer/keycloak")
            )
        )

        assertThat(resolver.defaultProfile().providerId).isEqualTo("azure")
    }

    @Test
    fun `rejects unsupported providers`() {
        val resolver = OAuth2ProviderResolver(
            defaultProvider = "azure",
            profiles = listOf(OAuth2ProviderProfile("azure", "Azure AD", "https://issuer/azure"))
        )

        assertThatThrownBy { resolver.requireByRegistrationId("github") }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessageContaining("Unsupported OAuth2 provider")
    }
}
```

- [ ] **Step 2: Run the new backend unit tests and confirm the classes do not exist yet**

Run: `./gradlew api:test --tests com.itsz.app.auth.oauth2.AzureAdClaimsAdapterTest --tests com.itsz.app.auth.oauth2.KeycloakClaimsAdapterTest --tests com.itsz.app.auth.oauth2.OAuth2ProviderResolverTest --tests com.itsz.app.auth.oauth2.OAuth2AuthorityMapperTest`

Expected: FAIL with compilation errors for missing `com.itsz.app.auth.oauth2` types.

- [ ] **Step 3: Add the provider profile, normalized principal, adapters, resolver, and authority mapper**

```kotlin
package com.itsz.app.auth.oauth2

data class OAuth2ProviderProfile(
    val providerId: String,
    val displayName: String,
    val issuerUri: String,
    val usernameClaims: List<String> = emptyList(),
    val emailClaims: List<String> = emptyList(),
    val roleClaims: List<String> = emptyList()
)

data class NormalizedOAuth2Principal(
    val provider: String,
    val subject: String,
    val username: String,
    val email: String,
    val groupsOrRoles: List<String>,
    val rawClaims: Map<String, Any?>
) {
    fun toAttributes(): Map<String, Any?> = rawClaims + mapOf(
        "provider" to provider,
        "subject" to subject,
        "username" to username,
        "email" to email,
        "groupsOrRoles" to groupsOrRoles
    )
}

interface OAuth2ClaimsAdapter {
    val providerId: String
    fun normalize(claims: Map<String, Any?>, profile: OAuth2ProviderProfile): NormalizedOAuth2Principal
}
```

```kotlin
package com.itsz.app.auth.oauth2

class AzureAdClaimsAdapter : OAuth2ClaimsAdapter {
    override val providerId: String = "azure"

    override fun normalize(claims: Map<String, Any?>, profile: OAuth2ProviderProfile): NormalizedOAuth2Principal {
        val username = profile.usernameClaims
            .firstNotNullOfOrNull { claim -> claims[claim] as? String }
            ?: claims["sub"].toString()
        val email = profile.emailClaims
            .firstNotNullOfOrNull { claim -> claims[claim] as? String }
            ?: "unknown@example.com"
        val normalizedRoles = profile.roleClaims
            .flatMap { claim -> (claims[claim] as? Collection<*>)?.map { it.toString() } ?: emptyList() }
            .map { role -> role.trim().uppercase().let { if (it.startsWith("ROLE_")) it else "ROLE_$it" } }
            .distinct()

        return NormalizedOAuth2Principal(
            provider = providerId,
            subject = claims["sub"].toString(),
            username = username,
            email = email,
            groupsOrRoles = normalizedRoles,
            rawClaims = claims
        )
    }
}
```

```kotlin
package com.itsz.app.auth.oauth2

class KeycloakClaimsAdapter : OAuth2ClaimsAdapter {
    override val providerId: String = "keycloak"

    override fun normalize(claims: Map<String, Any?>, profile: OAuth2ProviderProfile): NormalizedOAuth2Principal {
        val realmRoles = ((claims["realm_access"] as? Map<*, *>)?.get("roles") as? Collection<*>)
            ?.map { it.toString() }
            ?: emptyList()
        val resourceRoles = ((claims["resource_access"] as? Map<*, *>)?.values ?: emptyList())
            .flatMap { resource -> ((resource as? Map<*, *>)?.get("roles") as? Collection<*>)?.map { it.toString() } ?: emptyList() }

        val normalizedRoles = (realmRoles + resourceRoles)
            .map { role -> role.trim().uppercase().let { if (it.startsWith("ROLE_")) it else "ROLE_$it" } }
            .distinct()

        return NormalizedOAuth2Principal(
            provider = providerId,
            subject = claims["sub"].toString(),
            username = (claims["preferred_username"] as? String) ?: claims["sub"].toString(),
            email = (claims["email"] as? String) ?: "unknown@example.com",
            groupsOrRoles = normalizedRoles,
            rawClaims = claims
        )
    }
}
```

```kotlin
package com.itsz.app.auth.oauth2

import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority

class OAuth2ProviderResolver(
    defaultProvider: String,
    profiles: List<OAuth2ProviderProfile>
) {
    private val profilesById = profiles.associateBy { it.providerId }
    private val defaultProviderId = defaultProvider

    fun defaultProfile(): OAuth2ProviderProfile = requireByRegistrationId(defaultProviderId)

    fun requireByRegistrationId(registrationId: String): OAuth2ProviderProfile {
        return profilesById[registrationId]
            ?: throw IllegalArgumentException("Unsupported OAuth2 provider: $registrationId")
    }

    fun findByIssuer(issuer: String?): OAuth2ProviderProfile? {
        if (issuer.isNullOrBlank()) return null
        return profilesById.values.firstOrNull { it.issuerUri == issuer }
    }
}

class OAuth2AuthorityMapper {
    private val roleToPermissionsMap = mapOf(
        "ROLE_ADMIN" to setOf("COURSE_VIEW", "COURSE_EDIT", "TAG_VIEW", "TAG_EDIT", "USER_MANAGE", "ROLE_MANAGE"),
        "ROLE_USER" to setOf("COURSE_VIEW", "TAG_VIEW")
    )

    fun map(normalized: NormalizedOAuth2Principal, baseAuthorities: Collection<GrantedAuthority> = emptyList()): Set<GrantedAuthority> {
        val authorities = linkedSetOf<GrantedAuthority>()
        authorities.addAll(baseAuthorities)
        normalized.groupsOrRoles.forEach { role ->
            authorities.add(SimpleGrantedAuthority(role))
            roleToPermissionsMap[role]?.forEach { permission ->
                authorities.add(SimpleGrantedAuthority(permission))
            }
        }
        return authorities
    }
}
```

- [ ] **Step 4: Re-run the normalization unit tests**

Run: `./gradlew api:test --tests com.itsz.app.auth.oauth2.AzureAdClaimsAdapterTest --tests com.itsz.app.auth.oauth2.KeycloakClaimsAdapterTest --tests com.itsz.app.auth.oauth2.OAuth2ProviderResolverTest --tests com.itsz.app.auth.oauth2.OAuth2AuthorityMapperTest`

Expected: PASS.

- [ ] **Step 5: Commit the provider contract layer**

```bash
git add api/src/main/kotlin/com/itsz/app/auth/oauth2 api/src/test/kotlin/com/itsz/app/auth/oauth2
git commit -m "feat: add provider-agnostic oauth2 normalization"
```

### Task 2: Replace Keycloak-Specific Spring Security Beans

**Files:**
- Create: `api/src/main/kotlin/com/itsz/app/auth/oauth2/OAuth2ProviderProperties.kt`
- Create: `api/src/main/kotlin/com/itsz/app/auth/oauth2/ProviderAwareOidcUserService.kt`
- Create: `api/src/main/kotlin/com/itsz/app/auth/oauth2/ProviderAwareJwtAuthenticationConverter.kt`
- Create: `api/src/test/kotlin/com/itsz/app/auth/oauth2/ProviderAwareOidcUserServiceTest.kt`
- Modify: `api/src/main/resources/application.properties`
- Modify: `api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt`
- Modify: `api/src/test/kotlin/com/itsz/app/config/SecurityConfigSessionAuthTest.kt`
- Modify: `api/src/test/kotlin/com/itsz/app/config/TestSecurityConfigDisabler.kt`
- Delete: `api/src/main/kotlin/com/itsz/app/config/KeycloakOidcUserService.kt`
- Delete: `api/src/main/kotlin/com/itsz/app/config/KeycloakAuthorityMapper.kt`
- Delete: `api/src/main/kotlin/com/itsz/app/config/KeycloakJwtAuthenticationConverter.kt`
- Delete: `api/src/test/kotlin/com/itsz/app/config/KeycloakOidcUserServiceTest.kt`

- [ ] **Step 1: Write the failing provider-aware OIDC service test**

```kotlin
package com.itsz.app.auth.oauth2

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest
import org.springframework.security.oauth2.client.registration.ClientRegistration
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.AuthorizationGrantType
import org.springframework.security.oauth2.core.ClientAuthenticationMethod
import org.springframework.security.oauth2.core.OAuth2AccessToken
import org.springframework.security.oauth2.core.oidc.IdTokenClaimNames
import org.springframework.security.oauth2.core.oidc.OidcIdToken
import org.springframework.security.oauth2.core.oidc.OidcUserInfo
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import java.time.Instant

class ProviderAwareOidcUserServiceTest {

    @Test
    fun `normalizes keycloak claims and maps application permissions`() {
        val now = Instant.now()
        val registration = ClientRegistration.withRegistrationId("keycloak")
            .clientId("course-app")
            .clientSecret("secret")
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
            .redirectUri("http://localhost/login/oauth2/code/keycloak")
            .authorizationUri("http://localhost/auth")
            .tokenUri("http://localhost/token")
            .jwkSetUri("http://localhost/jwks")
            .issuerUri("http://localhost/realms/course-app")
            .userInfoUri("http://localhost/userinfo")
            .userNameAttributeName("preferred_username")
            .build()

        val request = OidcUserRequest(
            registration,
            OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "access-token", now, now.plusSeconds(300)),
            OidcIdToken("id-token", now, now.plusSeconds(300), mapOf(IdTokenClaimNames.SUB to "admin-id", "preferred_username" to "admin"))
        )

        val delegateUser = DefaultOidcUser(
            listOf(SimpleGrantedAuthority("OIDC_USER")),
            request.idToken,
            OidcUserInfo(mapOf("email" to "admin@course-app.local")),
            "preferred_username"
        )

        val service = ProviderAwareOidcUserService(
            providerResolver = OAuth2ProviderResolver(
                defaultProvider = "azure",
                profiles = listOf(OAuth2ProviderProfile("keycloak", "Keycloak", "http://localhost/realms/course-app"))
            ),
            adapters = listOf(KeycloakClaimsAdapter()).associateBy { it.providerId },
            authorityMapper = OAuth2AuthorityMapper(),
            delegate = OAuth2UserService<OidcUserRequest, OidcUser> { delegateUser },
            accessTokenClaimsLoader = { mapOf("realm_access" to mapOf("roles" to listOf("ROLE_ADMIN")), "sub" to "admin-id") }
        )

        val loadedUser = service.loadUser(request)

        assertThat(loadedUser.getAttribute<String>("provider")).isEqualTo("keycloak")
        assertThat(loadedUser.authorities.map { it.authority }).contains("ROLE_ADMIN", "COURSE_EDIT")
    }
}
```

- [ ] **Step 2: Run the targeted backend tests and confirm the current Keycloak beans are the blocker**

Run: `./gradlew api:test --tests com.itsz.app.auth.oauth2.ProviderAwareOidcUserServiceTest --tests com.itsz.app.config.SecurityConfigSessionAuthTest`

Expected: FAIL because `ProviderAwareOidcUserService` does not exist and the redirect still points to hardcoded Keycloak.

- [ ] **Step 3: Add provider properties plus provider-aware OIDC and JWT converters**

```kotlin
package com.itsz.app.auth.oauth2

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.oauth2")
data class OAuth2ProviderProperties(
    val defaultProvider: String = "azure",
    val providers: List<OAuth2ProviderProfile> = emptyList()
)
```

```kotlin
package com.itsz.app.auth.oauth2

import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.security.oauth2.core.oidc.OidcUserInfo
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtValidators
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder

class ProviderAwareOidcUserService(
    private val providerResolver: OAuth2ProviderResolver,
    private val adapters: Map<String, OAuth2ClaimsAdapter>,
    private val authorityMapper: OAuth2AuthorityMapper,
    private val delegate: OAuth2UserService<OidcUserRequest, OidcUser> = OidcUserService(),
    private val accessTokenClaimsLoader: (OidcUserRequest) -> Map<String, Any?> = { request ->
        val decoder = NimbusJwtDecoder.withJwkSetUri(request.clientRegistration.providerDetails.jwkSetUri).build()
        request.clientRegistration.providerDetails.issuerUri?.let { issuer ->
            decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuer))
        }
        decoder.decode(request.accessToken.tokenValue).claims
    }
) : OAuth2UserService<OidcUserRequest, OidcUser> {

    override fun loadUser(userRequest: OidcUserRequest): OidcUser {
        val oidcUser = delegate.loadUser(userRequest)
        val profile = providerResolver.requireByRegistrationId(userRequest.clientRegistration.registrationId)
        val mergedClaims = linkedMapOf<String, Any?>().apply {
            putAll(oidcUser.idToken.claims)
            oidcUser.userInfo?.claims?.let(::putAll)
            putAll(accessTokenClaimsLoader(userRequest))
        }
        val normalized = adapters.getValue(profile.providerId).normalize(mergedClaims, profile)
        val mappedAuthorities = authorityMapper.map(normalized, oidcUser.authorities)

        return DefaultOidcUser(mappedAuthorities, oidcUser.idToken, OidcUserInfo(normalized.toAttributes()), "username")
    }
}
```

```kotlin
package com.itsz.app.auth.oauth2

import org.springframework.core.convert.converter.Converter
import org.springframework.security.authentication.AbstractAuthenticationToken
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter

class ProviderAwareJwtAuthenticationConverter(
    private val providerResolver: OAuth2ProviderResolver,
    private val adapters: Map<String, OAuth2ClaimsAdapter>,
    private val authorityMapper: OAuth2AuthorityMapper
) : Converter<Jwt, AbstractAuthenticationToken> {
    private val defaultConverter = JwtGrantedAuthoritiesConverter()

    override fun convert(jwt: Jwt): AbstractAuthenticationToken {
        val profile = providerResolver.findByIssuer(jwt.issuer?.toString())
            ?: throw IllegalArgumentException("Unsupported OAuth2 issuer: ${jwt.issuer}")
        val normalized = adapters.getValue(profile.providerId).normalize(jwt.claims, profile)
        val authorities = authorityMapper.map(normalized, defaultConverter.convert(jwt) ?: emptyList())
        return JwtAuthenticationToken(jwt, authorities, normalized.username)
    }
}
```

- [ ] **Step 4: Replace the hardcoded Keycloak wiring in configuration**

```properties
app.oauth2.default-provider=${APP_OAUTH2_DEFAULT_PROVIDER:azure}
app.oauth2.providers[0].provider-id=azure
app.oauth2.providers[0].display-name=Azure AD
app.oauth2.providers[0].issuer-uri=${AZURE_ISSUER_URI:https://login.microsoftonline.com/${AZURE_TENANT_ID:common}/v2.0}
app.oauth2.providers[0].username-claims=preferred_username,upn,email,sub
app.oauth2.providers[0].email-claims=email,preferred_username,upn
app.oauth2.providers[0].role-claims=roles,groups
app.oauth2.providers[1].provider-id=keycloak
app.oauth2.providers[1].display-name=Keycloak
app.oauth2.providers[1].issuer-uri=${KEYCLOAK_ISSUER_URI:http://localhost:8080/realms/course-app}
app.oauth2.providers[1].username-claims=preferred_username,email,sub
app.oauth2.providers[1].email-claims=email,preferred_username
app.oauth2.providers[1].role-claims=realm_access,resource_access

spring.security.oauth2.client.registration.azure.client-id=${AZURE_CLIENT_ID:course-app}
spring.security.oauth2.client.registration.azure.client-secret=${AZURE_CLIENT_SECRET:change-me}
spring.security.oauth2.client.registration.azure.authorization-grant-type=authorization_code
spring.security.oauth2.client.registration.azure.redirect-uri={baseUrl}/login/oauth2/code/{registrationId}
spring.security.oauth2.client.registration.azure.scope=openid,profile,email
spring.security.oauth2.client.provider.azure.issuer-uri=${AZURE_ISSUER_URI:https://login.microsoftonline.com/${AZURE_TENANT_ID:common}/v2.0}
spring.security.oauth2.client.provider.azure.authorization-uri=${AZURE_AUTH_URI:https://login.microsoftonline.com/${AZURE_TENANT_ID:common}/oauth2/v2.0/authorize}
spring.security.oauth2.client.provider.azure.token-uri=${AZURE_TOKEN_URI:https://login.microsoftonline.com/${AZURE_TENANT_ID:common}/oauth2/v2.0/token}
spring.security.oauth2.client.provider.azure.jwk-set-uri=${AZURE_JWK_SET_URI:https://login.microsoftonline.com/${AZURE_TENANT_ID:common}/discovery/v2.0/keys}
spring.security.oauth2.client.provider.azure.user-name-attribute=preferred_username
```

```kotlin
@Configuration
@EnableConfigurationProperties(OAuth2ProviderProperties::class)
class SecurityConfig(
    private val userDetailsService: UserDetailsService,
    private val jwtAuthFilter: JwtAuthFilter,
    private val oauth2ProviderProperties: OAuth2ProviderProperties,
    @Value("\${app.oauth2.success-url}") private val successUrl: String
) {

    @Bean
    fun oauth2ProviderResolver(): OAuth2ProviderResolver =
        OAuth2ProviderResolver(oauth2ProviderProperties.defaultProvider, oauth2ProviderProperties.providers)

    @Bean
    fun oauth2ClaimsAdapters(): Map<String, OAuth2ClaimsAdapter> =
        listOf(AzureAdClaimsAdapter(), KeycloakClaimsAdapter()).associateBy { it.providerId }

    @Bean
    fun oauth2AuthorityMapper(): OAuth2AuthorityMapper = OAuth2AuthorityMapper()

    @Bean
    fun providerAwareOidcUserService(
        oauth2ProviderResolver: OAuth2ProviderResolver,
        oauth2ClaimsAdapters: Map<String, OAuth2ClaimsAdapter>,
        oauth2AuthorityMapper: OAuth2AuthorityMapper
    ): OAuth2UserService<OidcUserRequest, OidcUser> =
        ProviderAwareOidcUserService(oauth2ProviderResolver, oauth2ClaimsAdapters, oauth2AuthorityMapper)

    @Bean
    fun providerAwareJwtAuthenticationConverter(
        oauth2ProviderResolver: OAuth2ProviderResolver,
        oauth2ClaimsAdapters: Map<String, OAuth2ClaimsAdapter>,
        oauth2AuthorityMapper: OAuth2AuthorityMapper
    ) = ProviderAwareJwtAuthenticationConverter(oauth2ProviderResolver, oauth2ClaimsAdapters, oauth2AuthorityMapper)

    @Bean
    fun securityFilterChain(
        http: HttpSecurity,
        oauth2ProviderResolver: OAuth2ProviderResolver,
        providerAwareOidcUserService: OAuth2UserService<OidcUserRequest, OidcUser>,
        providerAwareJwtAuthenticationConverter: ProviderAwareJwtAuthenticationConverter
    ): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .authorizeHttpRequests {
                it
                    .requestMatchers("/", "/assets/**", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/error", "/**/*.html", "/**/*.css", "/**/*.js", "/**/*.png", "/**/*.jpg", "/**/*.jpeg", "/**/*.gif", "/**/*.svg", "/**/*.ico").permitAll()
                    .requestMatchers("/actuator/health/**", "/api/auth/login", "/api/auth/register", "/api/auth/logout", "/oauth2/**", "/login/oauth2/**", "/ws/**").permitAll()
                    .anyRequest().authenticated()
            }
            .oauth2Login { oauth2 ->
                oauth2.userInfoEndpoint { userInfo ->
                    userInfo.oidcUserService(providerAwareOidcUserService)
                }
                oauth2.defaultSuccessUrl(successUrl, true)
            }
            .exceptionHandling { exceptions ->
                val entryPoint = LoginUrlAuthenticationEntryPoint("/oauth2/authorization/${oauth2ProviderResolver.defaultProfile().providerId}")
                entryPoint.setFavorRelativeUris(false)
                exceptions.defaultAuthenticationEntryPointFor(entryPoint, RequestMatcher { request -> request.requestURI == "/courses" })
            }
            .oauth2ResourceServer { oauth2 ->
                oauth2.jwt { jwt -> jwt.jwtAuthenticationConverter(providerAwareJwtAuthenticationConverter) }
            }
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }
}
```

- [ ] **Step 5: Update the tests and mocks to the provider-aware bean names, then rerun**

Run: `./gradlew api:test --tests com.itsz.app.auth.oauth2.ProviderAwareOidcUserServiceTest --tests com.itsz.app.config.SecurityConfigSessionAuthTest`

Expected: PASS, with `SecurityConfigSessionAuthTest` redirecting to `/oauth2/authorization/azure` by default.

- [ ] **Step 6: Commit the Spring Security integration refactor**

```bash
git add api/src/main/resources/application.properties api/src/main/kotlin/com/itsz/app/auth/oauth2 api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt api/src/test/kotlin/com/itsz/app/auth/oauth2 api/src/test/kotlin/com/itsz/app/config/SecurityConfigSessionAuthTest.kt api/src/test/kotlin/com/itsz/app/config/TestSecurityConfigDisabler.kt
git rm api/src/main/kotlin/com/itsz/app/config/KeycloakOidcUserService.kt api/src/main/kotlin/com/itsz/app/config/KeycloakAuthorityMapper.kt api/src/main/kotlin/com/itsz/app/config/KeycloakJwtAuthenticationConverter.kt api/src/test/kotlin/com/itsz/app/config/KeycloakOidcUserServiceTest.kt
git commit -m "feat: wire provider-aware oauth2 security"
```

### Task 3: Normalize Session and Bearer Identity Surfaces

**Files:**
- Modify: `api/src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt`
- Modify: `api/src/main/kotlin/com/itsz/app/config/WebSocketAuthChannelInterceptor.kt`
- Create: `api/src/test/kotlin/com/itsz/app/config/WebSocketAuthChannelInterceptorTest.kt`
- Modify: `api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerSessionTest.kt`
- Modify: `api/src/test/kotlin/com/itsz/app/config/SecurityConfigSessionAuthTest.kt`

- [ ] **Step 1: Update the failing session and websocket tests first**

```kotlin
package com.itsz.app.auth.controller

import com.itsz.app.config.EmbeddedRedisSupport
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest
class AuthControllerSessionTest : EmbeddedRedisSupport() {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Test
    fun `me returns normalized session principal details`() {
        mockMvc.get("/api/auth/me") {
            with(
                oauth2Login().attributes {
                    it["username"] = "azure.user@contoso.com"
                    it["email"] = "azure.user@contoso.com"
                    it["provider"] = "azure"
                }
            )
        }.andExpect {
            status { isOk() }
            jsonPath("$.name") { value("azure.user@contoso.com") }
            jsonPath("$.email") { value("azure.user@contoso.com") }
            jsonPath("$.provider") { value("azure") }
            jsonPath("$.authType") { value("session") }
        }
    }
}
```

```kotlin
package com.itsz.app.config

import com.itsz.app.auth.jwt.JwtService
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.springframework.messaging.Message
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.security.authentication.TestingAuthenticationToken
import org.springframework.security.core.userdetails.UserDetailsService

class WebSocketAuthChannelInterceptorTest {

    @Test
    fun `keeps existing authenticated session principal without bearer header`() {
        val interceptor = WebSocketAuthChannelInterceptor(
            jwtService = mock(),
            userDetailsService = mock(),
            jwtAuthenticationConverter = mock(),
            jwtDecoders = emptyList()
        )
        val accessor = StompHeaderAccessor.create(StompCommand.CONNECT)
        accessor.user = TestingAuthenticationToken("session-user", null, "COURSE_VIEW").apply { isAuthenticated = true }
        val message = MessageBuilder.createMessage(ByteArray(0), accessor.messageHeaders)

        val result = interceptor.preSend(message, mock())

        requireNotNull(result)
    }
}
```

- [ ] **Step 2: Run the session-focused backend tests**

Run: `./gradlew api:test --tests com.itsz.app.auth.controller.AuthControllerSessionTest --tests com.itsz.app.config.SecurityConfigSessionAuthTest --tests com.itsz.app.config.WebSocketAuthChannelInterceptorTest`

Expected: FAIL because `/api/auth/me` still emits `authType=oauth2` and the interceptor still depends on Keycloak-only beans.

- [ ] **Step 3: Return normalized session identity from `/api/auth/me`**

```kotlin
@GetMapping("/me")
fun me(authentication: Authentication?): ResponseEntity<Map<String, String>> {
    if (authentication == null || !authentication.isAuthenticated) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
    }

    val principal = authentication.principal
    return when (principal) {
        is Jwt -> ResponseEntity.ok(
            mapOf(
                "name" to (principal.getClaimAsString("preferred_username") ?: principal.subject ?: "unknown"),
                "email" to (principal.getClaimAsString("email") ?: "unknown@example.com"),
                "provider" to (principal.issuer?.path?.substringAfterLast('/') ?: "unknown"),
                "authType" to "bearer"
            )
        )
        is OAuth2User -> ResponseEntity.ok(
            mapOf(
                "name" to (principal.getAttribute<String>("username") ?: principal.name),
                "email" to (principal.getAttribute<String>("email") ?: "unknown@example.com"),
                "provider" to (principal.getAttribute<String>("provider") ?: "unknown"),
                "authType" to "session"
            )
        )
        else -> ResponseEntity.ok(
            mapOf(
                "name" to authentication.name,
                "email" to "unknown@example.com",
                "provider" to "legacy",
                "authType" to "session"
            )
        )
    }
}
```

- [ ] **Step 4: Make WebSocket bearer fallback provider-aware while preserving session-first auth**

```kotlin
@Component
class WebSocketAuthChannelInterceptor(
    private val jwtService: JwtService,
    private val userDetailsService: UserDetailsService,
    private val jwtDecoders: List<JwtDecoder>,
    private val jwtAuthenticationConverter: ProviderAwareJwtAuthenticationConverter
) : ChannelInterceptor {

    override fun preSend(message: Message<*>, channel: MessageChannel): Message<*>? {
        val accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor::class.java) ?: return message

        if (accessor.command == StompCommand.CONNECT) {
            val existingPrincipal = accessor.user as? Authentication
            val hasAuthenticatedPrincipal = existingPrincipal?.isAuthenticated == true && existingPrincipal !is AnonymousAuthenticationToken
            if (hasAuthenticatedPrincipal) {
                return message
            }

            val rawHeader = accessor.getFirstNativeHeader("Authorization") ?: return message
            val token = rawHeader.removePrefix("Bearer ").trim()
            if (token.isBlank()) {
                throw BadCredentialsException("Missing JWT token")
            }

            val authentication = try {
                val username = jwtService.extractUsername(token)
                val userDetails = userDetailsService.loadUserByUsername(username)
                if (!jwtService.isTokenValid(token, userDetails)) {
                    throw BadCredentialsException("Invalid JWT token")
                }
                UsernamePasswordAuthenticationToken(userDetails, null, userDetails.authorities)
            } catch (_: Exception) {
                val jwt = jwtDecoders.asSequence()
                    .mapNotNull { decoder -> runCatching { decoder.decode(token) }.getOrNull() }
                    .firstOrNull()
                    ?: throw BadCredentialsException("Invalid JWT token - not recognized as legacy or OAuth2 token")
                jwtAuthenticationConverter.convert(jwt)
            }

            accessor.user = authentication
        }

        return message
    }
}
```

- [ ] **Step 5: Re-run the backend identity surface tests**

Run: `./gradlew api:test --tests com.itsz.app.auth.controller.AuthControllerSessionTest --tests com.itsz.app.config.SecurityConfigSessionAuthTest --tests com.itsz.app.config.WebSocketAuthChannelInterceptorTest`

Expected: PASS.

- [ ] **Step 6: Commit the normalized identity surface changes**

```bash
git add api/src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt api/src/main/kotlin/com/itsz/app/config/WebSocketAuthChannelInterceptor.kt api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerSessionTest.kt api/src/test/kotlin/com/itsz/app/config/SecurityConfigSessionAuthTest.kt api/src/test/kotlin/com/itsz/app/config/WebSocketAuthChannelInterceptorTest.kt
git commit -m "feat: normalize oauth2 session identity surfaces"
```

### Task 4: Make the Frontend Provider-Aware Without Reintroducing Token-Based OAuth2

**Files:**
- Create: `ui/src/config/oauth2.ts`
- Modify: `ui/src/api/authApi.ts`
- Modify: `ui/src/context/auth-context.ts`
- Modify: `ui/src/context/AuthContext.tsx`
- Modify: `ui/src/pages/auth/Login.tsx`
- Modify: `ui/src/pages/auth/__tests__/Login.test.tsx`
- Modify: `ui/src/context/__tests__/AuthContext.test.tsx`
- Modify: `ui/src/hooks/useWebSocket.ts`
- Modify: `ui/src/hooks/__tests__/useWebSocket.test.tsx`

- [ ] **Step 1: Update the failing frontend tests first**

```ts
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Login from "../Login";

it("renders the default Azure AD button label", () => {
  renderLogin();
  expect(screen.getByRole("button", { name: /continue with azure ad/i })).toBeInTheDocument();
});

it("redirects browser to the configured provider authorization endpoint", async () => {
  renderLogin();
  await user.click(screen.getByRole("button", { name: /continue with azure ad/i }));
  expect(window.location.href).toContain("/oauth2/authorization/azure");
});
```

```ts
it("treats normalized session users as authenticated", async () => {
  vi.spyOn(authApi, "getCurrentUser").mockResolvedValue({
    name: "azure.user@contoso.com",
    email: "azure.user@contoso.com",
    provider: "azure",
    authType: "session",
  });

  const { result } = renderHook(() => useAuthContext(), { wrapper });

  await waitFor(() => {
    expect(result.current.user).toEqual({
      name: "azure.user@contoso.com",
      email: "azure.user@contoso.com",
      provider: "azure",
      authType: "session",
    });
  });
});
```

- [ ] **Step 2: Run the targeted frontend tests and confirm the current text and types are wrong**

Run: `cd ui && npm test -- src/pages/auth/__tests__/Login.test.tsx src/context/__tests__/AuthContext.test.tsx src/hooks/__tests__/useWebSocket.test.tsx`

Expected: FAIL because the button still says Keycloak and the auth context still expects `authType="oauth2"` for session users.

- [ ] **Step 3: Add a dedicated frontend provider config helper**

```ts
const providerLabels: Record<string, string> = {
  azure: "Azure AD",
  keycloak: "Keycloak",
};

export const defaultOAuth2Provider = (import.meta.env.VITE_OAUTH2_DEFAULT_PROVIDER ?? "azure").toLowerCase();
export const defaultOAuth2ProviderLabel = providerLabels[defaultOAuth2Provider] ?? defaultOAuth2Provider;
export const defaultOAuth2AuthorizationPath = `/oauth2/authorization/${defaultOAuth2Provider}`;
```

- [ ] **Step 4: Update current-user typing and auth bootstrap to use normalized session payloads**

```ts
export interface CurrentUserResponse {
  name: string;
  email: string;
  provider: string;
  authType: "bearer" | "session";
}
```

```ts
export interface AuthenticatedUser {
  name: string;
  email: string;
  provider?: string;
  authType: "legacy" | "bearer" | "session";
}
```

```tsx
const sessionUser = await authApi.getCurrentUser();
if (requestId !== refreshRequestIdRef.current) return;

setUser({
  name: sessionUser.name,
  email: sessionUser.email,
  provider: sessionUser.provider,
  authType: sessionUser.authType,
});
setAuthStatus("authenticated");

if (token) {
  setTokenState(null);
}
localStorage.removeItem("legacyUser");
```

- [ ] **Step 5: Replace the hardcoded Keycloak button label and endpoint**

```tsx
import { defaultOAuth2AuthorizationPath, defaultOAuth2ProviderLabel } from "@/config/oauth2";

const handleOAuth2Login = () => {
  const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
  if (fromPath && fromPath !== "/login") {
    sessionStorage.setItem("oauth2_return_to", fromPath);
  }

  window.location.href = defaultOAuth2AuthorizationPath;
};
```

```tsx
<Button type="button" variant="outline" className="w-full" onClick={handleOAuth2Login}>
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
  </svg>
  {`Continue with ${defaultOAuth2ProviderLabel}`}
</Button>
```

- [ ] **Step 6: Keep WebSocket session connect cookie-first and update the session test expectation**

```ts
const connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
```

```ts
vi.mocked(useAuthContext).mockReturnValue({
  user: { name: "testuser", email: "test@example.com", provider: "azure", authType: "session" },
  token: null,
  authStatus: "authenticated",
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
});
```

- [ ] **Step 7: Re-run the targeted frontend tests and lint**

Run: `cd ui && npm test -- src/pages/auth/__tests__/Login.test.tsx src/context/__tests__/AuthContext.test.tsx src/hooks/__tests__/useWebSocket.test.tsx && npm run lint`

Expected: PASS.

- [ ] **Step 8: Commit the frontend provider-awareness changes**

```bash
git add ui/src/config/oauth2.ts ui/src/api/authApi.ts ui/src/context/auth-context.ts ui/src/context/AuthContext.tsx ui/src/pages/auth/Login.tsx ui/src/pages/auth/__tests__/Login.test.tsx ui/src/context/__tests__/AuthContext.test.tsx ui/src/hooks/useWebSocket.ts ui/src/hooks/__tests__/useWebSocket.test.tsx
git commit -m "feat: make oauth2 login provider-aware in ui"
```

### Task 5: Update Docs and Run Final Verification

**Files:**
- Modify: `README.md`
- Modify: `OAUTH2_SETUP_GUIDE.md`

- [ ] **Step 1: Document the new default-provider model and Azure-first flow**

```md
## OAuth2 Providers

The application now supports multiple OAuth2 providers through a normalized provider layer.

- Default provider is controlled by `app.oauth2.default-provider` and defaults to `azure`
- Supported providers in phase 1: `azure`, `keycloak`
- OAuth2 users authenticate with a server-side session; the UI reads identity from `/api/auth/me`
- Legacy username/password login still returns the application JWT for backward compatibility
```

```md
### Azure AD Setup

Set these environment variables before starting the backend:

- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `APP_OAUTH2_DEFAULT_PROVIDER=azure`

For local UI development, the login button redirects to `/oauth2/authorization/azure` by default.
```

- [ ] **Step 2: Run the final verification suite**

Run: `./gradlew api:test --tests com.itsz.app.auth.oauth2.AzureAdClaimsAdapterTest --tests com.itsz.app.auth.oauth2.KeycloakClaimsAdapterTest --tests com.itsz.app.auth.oauth2.OAuth2ProviderResolverTest --tests com.itsz.app.auth.oauth2.OAuth2AuthorityMapperTest --tests com.itsz.app.auth.oauth2.ProviderAwareOidcUserServiceTest --tests com.itsz.app.auth.controller.AuthControllerSessionTest --tests com.itsz.app.config.SecurityConfigSessionAuthTest --tests com.itsz.app.config.WebSocketAuthChannelInterceptorTest`

Expected: PASS.

- [ ] **Step 3: Run the frontend verification suite**

Run: `cd ui && npm test -- src/pages/auth/__tests__/Login.test.tsx src/context/__tests__/AuthContext.test.tsx src/hooks/__tests__/useWebSocket.test.tsx && npm run lint`

Expected: PASS.

- [ ] **Step 4: Commit docs and verification fallout**

```bash
git add README.md OAUTH2_SETUP_GUIDE.md
git commit -m "docs: document multi-provider oauth2"
```

- [ ] **Step 5: Optional full-repo confidence check before merge**

Run: `./gradlew api:test && cd ui && npm test && npm run lint`

Expected: PASS. If this is too slow for the task loop, run it once before opening the PR.