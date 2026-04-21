package com.itsz.app.auth.oauth2

class AzureAdClaimsAdapter : OAuth2ClaimsAdapter {
    override val providerId: String = "azure"

    override fun normalize(claims: Map<String, Any?>, profile: OAuth2ProviderProfile): NormalizedOAuth2Principal {
        val username = profile.usernameClaims
            .firstNotNullOfOrNull { claim -> claims[claim] as? String }
            ?: claims["sub"].toString()
        val email = profile.emailClaims
            .firstNotNullOfOrNull { claim -> claims[claim] as? String }
            ?: "unknown@example.com"
        val normalizedRoles = profile.roleClaims
            .flatMap { claim -> (claims[claim] as? Collection<*>)?.map { it.toString() } ?: emptyList() }
            .map { role -> role.trim().uppercase().let { if (it.startsWith("ROLE_")) it else "ROLE_$it" } }
            .distinct()

        return NormalizedOAuth2Principal(
            provider = providerId,
            subject = claims["sub"].toString(),
            username = username,
            email = email,
            groupsOrRoles = normalizedRoles,
            rawClaims = claims
        )
    }
}
