package com.itsz.app.auth.oauth2

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class AzureAdClaimsAdapterTest {

    private val profile = OAuth2ProviderProfile(
        providerId = "azure",
        displayName = "Azure AD",
        issuerUri = "https://login.microsoftonline.com/test-tenant/v2.0",
        usernameClaims = listOf("preferred_username", "upn", "email", "sub"),
        emailClaims = listOf("email", "preferred_username", "upn"),
        roleClaims = listOf("roles", "groups")
    )

    @Test
    fun `normalizes azure claims using configured precedence`() {
        val principal = AzureAdClaimsAdapter().normalize(
            mapOf(
                "sub" to "azure-subject",
                "preferred_username" to "azure.user@contoso.com",
                "roles" to listOf("admin")
            ),
            profile
        )

        assertThat(principal.provider).isEqualTo("azure")
        assertThat(principal.username).isEqualTo("azure.user@contoso.com")
        assertThat(principal.email).isEqualTo("azure.user@contoso.com")
        assertThat(principal.groupsOrRoles).containsExactly("ROLE_ADMIN")
    }
}
