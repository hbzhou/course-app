package com.itsz.app.config

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
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtDecoder
import java.time.Instant

class KeycloakOidcUserServiceTest {

    @Test
    fun `loadUser maps application permissions from access token roles`() {
        val now = Instant.now()
        val registration = ClientRegistration.withRegistrationId("keycloak")
            .clientId("course-app")
            .clientSecret("course-app-secret")
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

        val accessToken = OAuth2AccessToken(
            OAuth2AccessToken.TokenType.BEARER,
            "access-token",
            now,
            now.plusSeconds(300)
        )

        val idToken = OidcIdToken(
            "id-token",
            now,
            now.plusSeconds(300),
            mapOf(
                IdTokenClaimNames.SUB to "admin-id",
                "preferred_username" to "admin",
                "email" to "admin@course-app.local"
            )
        )

        val oidcUser = DefaultOidcUser(
            listOf(SimpleGrantedAuthority("OIDC_USER")),
            idToken,
            OidcUserInfo(mapOf("preferred_username" to "admin", "email" to "admin@course-app.local")),
            "preferred_username"
        )

        val request = OidcUserRequest(registration, accessToken, idToken)

        val jwtDecoder = JwtDecoder { tokenValue ->
            Jwt.withTokenValue(tokenValue)
                .header("alg", "RS256")
                .claim("sub", "admin-id")
                .claim("preferred_username", "admin")
                .claim("email", "admin@course-app.local")
                .claim("realm_access", mapOf("roles" to listOf("ROLE_ADMIN")))
                .issuedAt(now)
                .expiresAt(now.plusSeconds(300))
                .build()
        }

        val service = KeycloakOidcUserService(
            jwtDecoder,
            KeycloakAuthorityMapper(),
            OAuth2UserService<OidcUserRequest, OidcUser> { oidcUser }
        )

        val loadedUser = service.loadUser(request)

        assertThat(loadedUser.authorities.map { it.authority })
            .contains("ROLE_ADMIN", "COURSE_VIEW", "COURSE_EDIT", "TAG_VIEW", "TAG_EDIT", "USER_MANAGE", "ROLE_MANAGE")
    }
}