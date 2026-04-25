package com.itsz.app.auth.oauth2

class GoogleClaimsAdapter : OAuth2ClaimsAdapter {
    override val providerId: String = "google"

    override fun normalize(claims: Map<String, Any?>, profile: OAuth2ProviderProfile): NormalizedOAuth2Principal {
        val email = (claims["email"] as? String)
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?: throw IllegalArgumentException("Google email claim is required")

        if (!email.endsWith("@gmail.com", ignoreCase = true)) {
            throw IllegalArgumentException("Google account must use gmail.com domain")
        }

        val username = (claims["name"] as? String)
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?: email

        return NormalizedOAuth2Principal(
            provider = providerId,
            subject = claims["sub"].toString(),
            username = username,
            email = email,
            groupsOrRoles = emptyList(),
            rawClaims = claims
        )
    }
}