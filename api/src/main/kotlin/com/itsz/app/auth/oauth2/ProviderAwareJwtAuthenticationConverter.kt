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
