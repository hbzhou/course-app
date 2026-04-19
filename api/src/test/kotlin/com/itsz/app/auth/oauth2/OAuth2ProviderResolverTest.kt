package com.itsz.app.auth.oauth2

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class OAuth2ProviderResolverTest {

    @Test
    fun `returns configured default provider when no provider is requested`() {
        val resolver = OAuth2ProviderResolver(
            defaultProvider = "azure",
            profiles = listOf(
                OAuth2ProviderProfile("azure", "Azure AD", "https://issuer/azure"),
                OAuth2ProviderProfile("keycloak", "Keycloak", "https://issuer/keycloak")
            )
        )

        assertThat(resolver.defaultProfile().providerId).isEqualTo("azure")
    }

    @Test
    fun `rejects unsupported providers`() {
        val resolver = OAuth2ProviderResolver(
            defaultProvider = "azure",
            profiles = listOf(OAuth2ProviderProfile("azure", "Azure AD", "https://issuer/azure"))
        )

        assertThatThrownBy { resolver.requireByRegistrationId("github") }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessageContaining("Unsupported OAuth2 provider")
    }
}
