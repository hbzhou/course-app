package com.itsz.app.auth.oauth2

import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.oidc.OidcUserInfo
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser
import org.springframework.security.oauth2.core.oidc.user.OidcUser
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
