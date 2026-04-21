package com.itsz.app.config

import org.slf4j.LoggerFactory
import org.springframework.core.convert.converter.Converter
import org.springframework.security.authentication.AbstractAuthenticationToken
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter

/**
 * Converts Keycloak JWT tokens to Spring Security authentication tokens.
 * Extracts roles from Keycloak and maps them to application permissions.
 */
class KeycloakJwtAuthenticationConverter(
    private val keycloakAuthorityMapper: KeycloakAuthorityMapper
) : Converter<Jwt, AbstractAuthenticationToken> {

    private val logger = LoggerFactory.getLogger(KeycloakJwtAuthenticationConverter::class.java)
    private val defaultGrantedAuthoritiesConverter = JwtGrantedAuthoritiesConverter()

    override fun convert(jwt: Jwt): AbstractAuthenticationToken {
        val authorities = keycloakAuthorityMapper.mapClaims(
            jwt.claims,
            defaultGrantedAuthoritiesConverter.convert(jwt) ?: emptyList()
        )
        logger.info("Final authorities: ${authorities.map { it.authority }}")

        return JwtAuthenticationToken(jwt, authorities)
    }
}
