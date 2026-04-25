package com.itsz.app.auth.oauth2

class GoogleClaimsAdapter : OAuth2ClaimsAdapter {
    override val providerId: String = "google"

    override fun normalize(claims: Map<String, Any?>, profile: OAuth2ProviderProfile): NormalizedOAuth2Principal {
        val subject = (claims["sub"] as? String)
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?: throw IllegalArgumentException("Google sub claim is required")

        val email = (claims["email"] as? String)
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?: throw IllegalArgumentException("Google email claim is required")

        if (!email.endsWith("@gmail.com", ignoreCase = true)) {
            throw IllegalArgumentException("Google account must use gmail.com domain")
        }

        val username = profile.usernameClaims
            .firstNotNullOfOrNull { claim ->
                (claims[claim] as? String)
                    ?.trim()
                    ?.takeIf { it.isNotBlank() }
            }
            ?: subject

        return NormalizedOAuth2Principal(
            provider = providerId,
            subject = subject,
            username = username,
            email = email,
            groupsOrRoles = emptyList(),
            rawClaims = claims
        )
    }
}