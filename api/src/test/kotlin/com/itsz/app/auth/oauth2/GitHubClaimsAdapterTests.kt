package com.itsz.app.auth.oauth2

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class GitHubClaimsAdapterTests {

    private val profile = OAuth2ProviderProfile(
        providerId = "github",
        displayName = "GitHub",
        issuerUri = "https://github.com",
        usernameClaims = listOf("preferred_username", "login"),
        emailClaims = listOf("email"),
        roleClaims = emptyList()
    )

    private val alternateEmailProfile = profile.copy(
        emailClaims = listOf("primary_email")
    )

    private val profileWithoutLoginUsernameClaim = profile.copy(
        usernameClaims = listOf("preferred_username", "name")
    )

    @Test
    fun `normalizes valid github claims`() {
        val principal = GitHubClaimsAdapter().normalize(
            mapOf(
                "sub" to "github-user-123",
                "login" to "octocat",
                "email" to "octocat@github.com"
            ),
            profile
        )

        assertThat(principal.provider).isEqualTo("github")
        assertThat(principal.subject).isEqualTo("github-user-123")
        assertThat(principal.username).isEqualTo("octocat")
        assertThat(principal.email).isEqualTo("octocat@github.com")
        assertThat(principal.groupsOrRoles).isEmpty()
    }

    @Test
    fun `uses username claim before login when available`() {
        val principal = GitHubClaimsAdapter().normalize(
            mapOf(
                "sub" to "github-user-123",
                "preferred_username" to "  the-octo-user  ",
                "login" to "octocat",
                "email" to "octocat@github.com"
            ),
            profileWithoutLoginUsernameClaim
        )

        assertThat(principal.username).isEqualTo("the-octo-user")
    }

    @Test
    fun `uses configured username claim when login is absent`() {
        val principal = GitHubClaimsAdapter().normalize(
            mapOf(
                "sub" to "github-user-123",
                "preferred_username" to "the-octo-user",
                "email" to "octocat@github.com"
            ),
            profile
        )

        assertThat(principal.username).isEqualTo("the-octo-user")
    }

    @Test
    fun `uses configured username claim when login is blank`() {
        val principal = GitHubClaimsAdapter().normalize(
            mapOf(
                "sub" to "github-user-123",
                "preferred_username" to "the-octo-user",
                "login" to "   ",
                "email" to "octocat@github.com"
            ),
            profile
        )

        assertThat(principal.username).isEqualTo("the-octo-user")
    }

    @Test
    fun `falls back to login when configured username claims do not resolve`() {
        val principal = GitHubClaimsAdapter().normalize(
            mapOf(
                "sub" to "github-user-123",
                "preferred_username" to "   ",
                "login" to "octocat",
                "email" to "octocat@github.com"
            ),
            profileWithoutLoginUsernameClaim
        )

        assertThat(principal.username).isEqualTo("octocat")
    }

    @Test
    fun `resolves email using configured email claims`() {
        val principal = GitHubClaimsAdapter().normalize(
            mapOf(
                "sub" to "github-user-123",
                "login" to "octocat",
                "primary_email" to "octocat@github.com"
            ),
            alternateEmailProfile
        )

        assertThat(principal.email).isEqualTo("octocat@github.com")
    }

    @Test
    fun `trims required claim values`() {
        val principal = GitHubClaimsAdapter().normalize(
            mapOf(
                "sub" to "  github-user-123  ",
                "login" to "  octocat  ",
                "email" to "  octocat@github.com  "
            ),
            profile
        )

        assertThat(principal.subject).isEqualTo("github-user-123")
        assertThat(principal.username).isEqualTo("octocat")
        assertThat(principal.email).isEqualTo("octocat@github.com")
    }

    @Test
    fun `requires sub claim`() {
        assertThatThrownBy {
            GitHubClaimsAdapter().normalize(
                mapOf(
                    "login" to "octocat",
                    "email" to "octocat@github.com"
                ),
                profile
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("GitHub sub claim is required")
    }

    @Test
    fun `rejects blank sub claim`() {
        assertThatThrownBy {
            GitHubClaimsAdapter().normalize(
                mapOf(
                    "sub" to "   ",
                    "login" to "octocat",
                    "email" to "octocat@github.com"
                ),
                profile
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("GitHub sub claim is required")
    }

    @Test
    fun `requires email claim`() {
        assertThatThrownBy {
            GitHubClaimsAdapter().normalize(
                mapOf(
                    "sub" to "github-user-123",
                    "login" to "octocat"
                ),
                profile
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("GitHub email claim is required")
    }

    @Test
    fun `rejects blank email claim`() {
        assertThatThrownBy {
            GitHubClaimsAdapter().normalize(
                mapOf(
                    "sub" to "github-user-123",
                    "login" to "octocat",
                    "email" to "   "
                ),
                profile
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("GitHub email claim is required")
    }

    @Test
    fun `requires login claim`() {
        assertThatThrownBy {
            GitHubClaimsAdapter().normalize(
                mapOf(
                    "sub" to "github-user-123",
                    "email" to "octocat@github.com"
                ),
                profile
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("GitHub login claim is required")
    }

    @Test
    fun `rejects blank login claim when configured username claims do not resolve`() {
        assertThatThrownBy {
            GitHubClaimsAdapter().normalize(
                mapOf(
                    "sub" to "github-user-123",
                    "preferred_username" to "   ",
                    "login" to "   ",
                    "email" to "octocat@github.com"
                ),
                profileWithoutLoginUsernameClaim
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("GitHub login claim is required")
    }
}