package com.itsz.app.auth.oauth2

class GitHubClaimsAdapter : OAuth2ClaimsAdapter {
    override val providerId: String = "github"

    override fun normalize(claims: Map<String, Any?>, profile: OAuth2ProviderProfile): NormalizedOAuth2Principal {
        val subject = (claims["sub"] as? String)
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?: throw IllegalArgumentException("GitHub sub claim is required")

        val email = profile.emailClaims
            .firstNotNullOfOrNull { claim ->
                (claims[claim] as? String)
                    ?.trim()
                    ?.takeIf { it.isNotBlank() }
            }
            ?: throw IllegalArgumentException("GitHub email claim is required")

        val username = profile.usernameClaims
            .firstNotNullOfOrNull { claim ->
                (claims[claim] as? String)
                    ?.trim()
                    ?.takeIf { it.isNotBlank() }
            }
            ?: (claims["login"] as? String)
                ?.trim()
                ?.takeIf { it.isNotBlank() }
            ?: throw IllegalArgumentException("GitHub login claim is required")

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