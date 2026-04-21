package com.itsz.app.config

import org.springframework.security.core.authority.mapping.GrantedAuthoritiesMapper
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.security.oauth2.jwt.JwtDecoder

class KeycloakOidcUserService(
    private val jwtDecoder: JwtDecoder,
    private val keycloakAuthorityMapper: KeycloakAuthorityMapper,
    private val delegate: OAuth2UserService<OidcUserRequest, OidcUser> = OidcUserService()
) : OAuth2UserService<OidcUserRequest, OidcUser> {

    override fun loadUser(userRequest: OidcUserRequest): OidcUser {
        val oidcUser = delegate.loadUser(userRequest)
        val accessTokenJwt = jwtDecoder.decode(userRequest.accessToken.tokenValue)
        val mappedAuthorities = keycloakAuthorityMapper
            .mapClaims(accessTokenJwt.claims, oidcUser.authorities)

        return DefaultOidcUser(
            mappedAuthorities,
            oidcUser.idToken,
            oidcUser.userInfo,
            "preferred_username"
        )
    }
}