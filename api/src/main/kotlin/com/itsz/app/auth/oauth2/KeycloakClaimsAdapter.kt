package com.itsz.app.auth.oauth2

class KeycloakClaimsAdapter : OAuth2ClaimsAdapter {
    override val providerId: String = "keycloak"

    override fun normalize(claims: Map<String, Any?>, profile: OAuth2ProviderProfile): NormalizedOAuth2Principal {
        val realmRoles = ((claims["realm_access"] as? Map<*, *>)?.get("roles") as? Collection<*>)
            ?.map { it.toString() }
            ?: emptyList()
        val resourceRoles = ((claims["resource_access"] as? Map<*, *>)?.values ?: emptyList<Any>())
            .flatMap { resource ->
                ((resource as? Map<*, *>)?.get("roles") as? Collection<*>)?.map { it.toString() } ?: emptyList()
            }

        val normalizedRoles = (realmRoles + resourceRoles)
            .map { role -> role.trim().uppercase().let { if (it.startsWith("ROLE_")) it else "ROLE_$it" } }
            .distinct()

        return NormalizedOAuth2Principal(
            provider = providerId,
            subject = claims["sub"].toString(),
            username = (claims["preferred_username"] as? String) ?: claims["sub"].toString(),
            email = (claims["email"] as? String) ?: "unknown@example.com",
            groupsOrRoles = normalizedRoles,
            rawClaims = claims
        )
    }
}
