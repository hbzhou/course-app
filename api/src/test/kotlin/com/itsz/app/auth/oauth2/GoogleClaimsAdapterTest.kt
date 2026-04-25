package com.itsz.app.auth.oauth2

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class GoogleClaimsAdapterTest {

    private val profile = OAuth2ProviderProfile(
        providerId = "google",
        displayName = "Google",
        issuerUri = "https://accounts.google.com",
        usernameClaims = listOf("name", "email", "sub"),
        emailClaims = listOf("email"),
        roleClaims = emptyList()
    )

    private val profileWithoutEmailUsernameClaim = OAuth2ProviderProfile(
        providerId = "google",
        displayName = "Google",
        issuerUri = "https://accounts.google.com",
        usernameClaims = listOf("name", "preferred_username"),
        emailClaims = listOf("email"),
        roleClaims = emptyList()
    )

    @Test
    fun `normalizes valid gmail claims`() {
        val principal = GoogleClaimsAdapter().normalize(
            mapOf(
                "sub" to "google-subject",
                "name" to "Google User",
                "email" to "user@gmail.com"
            ),
            profile
        )

        assertThat(principal.provider).isEqualTo("google")
        assertThat(principal.subject).isEqualTo("google-subject")
        assertThat(principal.username).isEqualTo("Google User")
        assertThat(principal.email).isEqualTo("user@gmail.com")
        assertThat(principal.groupsOrRoles).isEmpty()
    }

    @Test
    fun `rejects non-gmail domain`() {
        assertThatThrownBy {
            GoogleClaimsAdapter().normalize(
                mapOf(
                    "sub" to "google-subject",
                    "email" to "user@example.com"
                ),
                profile
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessageContaining("gmail")
    }

    @Test
    fun `accepts uppercase mixed-case gmail domain with whitespace trimming`() {
        val principal = GoogleClaimsAdapter().normalize(
            mapOf(
                "sub" to "google-subject",
                "email" to "  User.Name@GmAiL.CoM  "
            ),
            profile
        )

        assertThat(principal.provider).isEqualTo("google")
        assertThat(principal.username).isEqualTo("User.Name@GmAiL.CoM")
        assertThat(principal.email).isEqualTo("User.Name@GmAiL.CoM")
        assertThat(principal.groupsOrRoles).isEmpty()
    }

    @Test
    fun `uses email as username when name is absent based on profile claim order`() {
        val principal = GoogleClaimsAdapter().normalize(
            mapOf(
                "sub" to "google-subject",
                "email" to "user@gmail.com"
            ),
            profile
        )

        assertThat(principal.username).isEqualTo("user@gmail.com")
        assertThat(principal.email).isEqualTo("user@gmail.com")
    }

    @Test
    fun `falls back to sub for username when profile username claims are absent even with email present`() {
        val principal = GoogleClaimsAdapter().normalize(
            mapOf(
                "sub" to "google-subject",
                "email" to "user@gmail.com"
            ),
            profileWithoutEmailUsernameClaim
        )

        assertThat(principal.username).isEqualTo("google-subject")
        assertThat(principal.email).isEqualTo("user@gmail.com")
    }

    @Test
    fun `requires email claim`() {
        assertThatThrownBy {
            GoogleClaimsAdapter().normalize(
                mapOf(
                    "sub" to "google-subject"
                ),
                profile
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessageContaining("email")
    }
}