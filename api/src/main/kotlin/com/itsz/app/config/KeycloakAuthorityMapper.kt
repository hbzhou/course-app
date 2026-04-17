package com.itsz.app.config

import org.slf4j.LoggerFactory
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.authority.mapping.GrantedAuthoritiesMapper
import org.springframework.security.oauth2.core.user.OAuth2UserAuthority
import org.springframework.security.oauth2.core.oidc.user.OidcUserAuthority

class KeycloakAuthorityMapper : GrantedAuthoritiesMapper {

    private val logger = LoggerFactory.getLogger(KeycloakAuthorityMapper::class.java)

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

    fun mapClaims(claims: Map<String, Any?>, baseAuthorities: Collection<GrantedAuthority> = emptyList()): Set<GrantedAuthority> {
        val authorities = linkedSetOf<GrantedAuthority>()
        authorities.addAll(baseAuthorities)

        val keycloakRoles = mutableSetOf<String>()

        val realmAccess = claims["realm_access"] as? Map<*, *>
        val realmRoles = realmAccess?.get("roles") as? List<*>
        realmRoles?.forEach { role ->
            val roleName = normalizeRole(role.toString())
            keycloakRoles.add(roleName)
            authorities.add(SimpleGrantedAuthority(roleName))
        }

        val resourceAccess = claims["resource_access"] as? Map<*, *>
        resourceAccess?.values?.forEach { resource ->
            val resourceMap = resource as? Map<*, *>
            val roles = resourceMap?.get("roles") as? List<*>
            roles?.forEach { role ->
                val roleName = normalizeRole(role.toString())
                keycloakRoles.add(roleName)
                authorities.add(SimpleGrantedAuthority(roleName))
            }
        }

        keycloakRoles.forEach { roleName ->
            roleToPermissionsMap[roleName]?.forEach { permission ->
                authorities.add(SimpleGrantedAuthority(permission))
            }
        }

        logger.info("Mapped Keycloak roles {} to authorities {}", keycloakRoles, authorities.map { it.authority })

        return authorities
    }

    override fun mapAuthorities(authorities: MutableCollection<out GrantedAuthority>): MutableCollection<out GrantedAuthority> {
        val mappedAuthorities = linkedSetOf<GrantedAuthority>()
        val sourceAuthorities = authorities.toList()

        sourceAuthorities.forEach { authority ->
            mappedAuthorities.add(authority)

            when (authority) {
                is OidcUserAuthority -> {
                    val claims = authority.idToken.claims.toMutableMap()
                    authority.userInfo?.claims?.let { claims.putAll(it) }
                    mappedAuthorities.addAll(mapClaims(claims, emptyList()))
                }
                is OAuth2UserAuthority -> {
                    mappedAuthorities.addAll(mapClaims(authority.attributes, emptyList()))
                }
            }
        }

        return mappedAuthorities
    }
}