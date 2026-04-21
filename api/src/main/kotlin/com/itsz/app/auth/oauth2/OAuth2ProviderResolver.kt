package com.itsz.app.auth.oauth2

class OAuth2ProviderResolver(
    defaultProvider: String,
    profiles: List<OAuth2ProviderProfile>
) {
    private val profilesById = profiles.associateBy { it.providerId }
    private val defaultProviderId = defaultProvider

    fun defaultProfile(): OAuth2ProviderProfile = requireByRegistrationId(defaultProviderId)

    fun requireByRegistrationId(registrationId: String): OAuth2ProviderProfile {
        return profilesById[registrationId]
            ?: throw IllegalArgumentException("Unsupported OAuth2 provider: $registrationId")
    }

    fun findByIssuer(issuer: String?): OAuth2ProviderProfile? {
        if (issuer.isNullOrBlank()) return null
        return profilesById.values.firstOrNull { it.issuerUri == issuer }
    }
}
