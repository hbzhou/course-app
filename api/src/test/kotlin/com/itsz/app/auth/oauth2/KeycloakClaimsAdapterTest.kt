package com.itsz.app.auth.oauth2

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class KeycloakClaimsAdapterTest {

    private val profile = OAuth2ProviderProfile(
        providerId = "keycloak",
        displayName = "Keycloak",
        issuerUri = "http://localhost:8080/realms/course-app",
        usernameClaims = listOf("preferred_username", "email", "sub"),
        emailClaims = listOf("email", "preferred_username"),
        roleClaims = listOf("realm_access", "resource_access")
    )

    @Test
    fun `normalizes keycloak realm and resource roles`() {
        val principal = KeycloakClaimsAdapter().normalize(
            mapOf(
                "sub" to "kc-subject",
                "preferred_username" to "kc-admin",
                "email" to "admin@course-app.local",
                "realm_access" to mapOf("roles" to listOf("admin")),
                "resource_access" to mapOf(
                    "course-app" to mapOf("roles" to listOf("user")),
                    "account" to mapOf("roles" to listOf("manage-account"))
                )
            ),
            profile
        )

        assertThat(principal.provider).isEqualTo("keycloak")
        assertThat(principal.username).isEqualTo("kc-admin")
        assertThat(principal.email).isEqualTo("admin@course-app.local")
        assertThat(principal.groupsOrRoles).containsExactlyInAnyOrder(
            "ROLE_ADMIN",
            "ROLE_USER",
            "ROLE_MANAGE-ACCOUNT"
        )
    }
}
