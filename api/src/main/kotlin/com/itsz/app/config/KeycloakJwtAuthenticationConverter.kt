package com.itsz.app.config

import org.slf4j.LoggerFactory
import org.springframework.core.convert.converter.Converter
import org.springframework.security.authentication.AbstractAuthenticationToken
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter

/**
 * Converts Keycloak JWT tokens to Spring Security authentication tokens.
 * Extracts roles from Keycloak and maps them to application permissions.
 */
class KeycloakJwtAuthenticationConverter : Converter<Jwt, AbstractAuthenticationToken> {

    private val logger = LoggerFactory.getLogger(KeycloakJwtAuthenticationConverter::class.java)
    private val defaultGrantedAuthoritiesConverter = JwtGrantedAuthoritiesConverter()

    // Match DB seed data in V2/V4 migrations: ROLE_ADMIN / ROLE_USER
    private val roleToPermissionsMap = mapOf(
        "ROLE_ADMIN" to setOf(
            "COURSE_VIEW",
            "COURSE_EDIT",
            "TAG_VIEW",
            "TAG_EDIT",
            "USER_MANAGE",
            "ROLE_MANAGE"
        ),
        "ROLE_USER" to setOf(
            "COURSE_VIEW",
            "TAG_VIEW"
        )
    )

    private fun normalizeRole(rawRole: String): String {
        val trimmed = rawRole.trim().uppercase()
        return if (trimmed.startsWith("ROLE_")) trimmed else "ROLE_$trimmed"
    }

    override fun convert(jwt: Jwt): AbstractAuthenticationToken {
        val authorities = mutableSetOf<GrantedAuthority>()

        // Add default authorities from scope
        authorities.addAll(defaultGrantedAuthoritiesConverter.convert(jwt) ?: emptyList())

        // Extract realm roles from Keycloak token
        val realmAccess = jwt.claims["realm_access"] as? Map<*, *>
        val realmRoles = realmAccess?.get("roles") as? List<*>
        
        logger.info("Keycloak JWT - realm_access: $realmAccess")
        logger.info("Keycloak JWT - realm roles: $realmRoles")
        
        val keycloakRoles = mutableSetOf<String>()
        
        realmRoles?.forEach { role ->
            val roleName = normalizeRole(role.toString())
            keycloakRoles.add(roleName)
            authorities.add(SimpleGrantedAuthority(roleName))
        }

        // Extract client roles from Keycloak token
        val resourceAccess = jwt.claims["resource_access"] as? Map<*, *>
        logger.info("Keycloak JWT - resource_access: $resourceAccess")
        
        resourceAccess?.values?.forEach { resource ->
            val resourceMap = resource as? Map<*, *>
            val roles = resourceMap?.get("roles") as? List<*>
            roles?.forEach { role ->
                val roleName = normalizeRole(role.toString())
                keycloakRoles.add(roleName)
                authorities.add(SimpleGrantedAuthority(roleName))
            }
        }

        logger.info("Keycloak roles found: $keycloakRoles")

        // Map Keycloak roles to application permissions
        keycloakRoles.forEach { roleName ->
            roleToPermissionsMap[roleName]?.forEach { permission ->
                authorities.add(SimpleGrantedAuthority(permission))
                logger.debug("Granted permission: $permission from role: $roleName")
            }
        }

        if (keycloakRoles.none { it in roleToPermissionsMap.keys }) {
            logger.warn("No recognized Keycloak roles found, no permissions granted")
        }

        logger.info("Final authorities: ${authorities.map { it.authority }}")

        return JwtAuthenticationToken(jwt, authorities)
    }
}
