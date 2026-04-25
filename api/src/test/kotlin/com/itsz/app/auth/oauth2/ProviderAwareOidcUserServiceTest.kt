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

    @Test
    fun `uses provider default role when normalized roles are empty`() {
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
            OidcIdToken("id-token", now, now.plusSeconds(300), mapOf(IdTokenClaimNames.SUB to "guest-id", "preferred_username" to "guest"))
        )

        val delegateUser = DefaultOidcUser(
            listOf(SimpleGrantedAuthority("OIDC_USER")),
            request.idToken,
            OidcUserInfo(mapOf("email" to "guest@course-app.local")),
            "preferred_username"
        )

        val service = ProviderAwareOidcUserService(
            providerResolver = OAuth2ProviderResolver(
                defaultProvider = "keycloak",
                profiles = listOf(
                    OAuth2ProviderProfile(
                        providerId = "keycloak",
                        displayName = "Keycloak",
                        issuerUri = "http://localhost/realms/course-app",
                        defaultRole = "ROLE_GUEST"
                    )
                )
            ),
            adapters = listOf(KeycloakClaimsAdapter()).associateBy { it.providerId },
            authorityMapper = OAuth2AuthorityMapper(),
            delegate = OAuth2UserService<OidcUserRequest, OidcUser> { delegateUser },
            accessTokenClaimsLoader = { emptyMap() }
        )

        val loadedUser = service.loadUser(request)

        assertThat(loadedUser.authorities.map { it.authority }).contains(
            "ROLE_GUEST",
            "COURSE_VIEW",
            "TAG_VIEW",
            "AUTHOR_VIEW"
        )
    }
}
