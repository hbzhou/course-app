package com.itsz.app.auth.oauth2

import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority

class OAuth2AuthorityMapper {
    private val roleToPermissionsMap = mapOf(
        "ROLE_ADMIN" to setOf("COURSE_VIEW", "COURSE_EDIT", "TAG_VIEW", "TAG_EDIT", "AUTHOR_VIEW", "USER_MANAGE", "ROLE_MANAGE"),
        "ROLE_USER" to setOf("COURSE_VIEW", "TAG_VIEW"),
        "ROLE_GUEST" to setOf("COURSE_VIEW", "TAG_VIEW", "AUTHOR_VIEW")
    )

    /** Default role granted to any authenticated OAuth2 user when the provider sends no roles. */
    private val defaultRole = "ROLE_USER"

    fun map(
        normalized: NormalizedOAuth2Principal,
        baseAuthorities: Collection<GrantedAuthority> = emptyList(),
        profile: OAuth2ProviderProfile? = null
    ): Set<GrantedAuthority> {
        val authorities = linkedSetOf<GrantedAuthority>()
        authorities.addAll(baseAuthorities)
        val providerDefaultRole = profile?.defaultRole
            ?.let(::normalizeRole)
            ?.takeIf { it.isNotBlank() }
        val roles = normalized.groupsOrRoles.ifEmpty { listOf(providerDefaultRole ?: defaultRole) }
        roles.forEach { role ->
            authorities.add(SimpleGrantedAuthority(role))
            roleToPermissionsMap[role]?.forEach { permission ->
                authorities.add(SimpleGrantedAuthority(permission))
            }
        }
        return authorities
    }

    private fun normalizeRole(role: String): String {
        val normalizedRole = role.trim().uppercase()
        if (normalizedRole.isBlank()) return normalizedRole
        return if (normalizedRole.startsWith("ROLE_")) normalizedRole else "ROLE_$normalizedRole"
    }
}
