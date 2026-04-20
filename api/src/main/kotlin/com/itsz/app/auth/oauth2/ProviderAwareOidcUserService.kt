package com.itsz.app.auth.oauth2

import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.slf4j.LoggerFactory
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
        try {
            val decoder = NimbusJwtDecoder.withJwkSetUri(request.clientRegistration.providerDetails.jwkSetUri).build()
            request.clientRegistration.providerDetails.issuerUri?.let { issuer ->
                decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuer))
            }
            decoder.decode(request.accessToken.tokenValue).claims
        } catch (e: Exception) {
            // Azure AD v2.0 access tokens with Graph audience are opaque and cannot be decoded.
            // Fall back to empty map; ID token + userinfo claims are sufficient for normalization.
            LoggerFactory.getLogger(ProviderAwareOidcUserService::class.java)
                .debug("Access token is not a decodable JWT (expected for Azure AD), skipping: {}", e.message)
            emptyMap()
        }
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
