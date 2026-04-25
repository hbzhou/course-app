package com.itsz.app.auth.oauth2

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.client.registration.ClientRegistration
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.AuthorizationGrantType
import org.springframework.security.oauth2.core.ClientAuthenticationMethod
import org.springframework.security.oauth2.core.OAuth2AccessToken
import org.springframework.security.oauth2.core.user.DefaultOAuth2User
import org.springframework.security.oauth2.core.user.OAuth2User
import java.time.Instant
import java.util.concurrent.atomic.AtomicInteger

class ProviderAwareOAuth2UserServiceTest {

    private val githubProfile = OAuth2ProviderProfile(
        providerId = "github",
        displayName = "GitHub",
        issuerUri = "https://github.com",
        usernameClaims = listOf("login", "name"),
        emailClaims = listOf("email"),
        defaultRole = "ROLE_GUEST"
    )

    private val googleProfile = OAuth2ProviderProfile(
        providerId = "google",
        displayName = "Google",
        issuerUri = "https://accounts.google.com",
        usernameClaims = listOf("email"),
        emailClaims = listOf("email"),
        defaultRole = "ROLE_GUEST"
    )

    private fun githubRegistration(): ClientRegistration = ClientRegistration.withRegistrationId("github")
        .clientId("course-app-github")
        .clientSecret("secret")
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
        .redirectUri("http://localhost/login/oauth2/code/github")
        .authorizationUri("https://github.com/login/oauth/authorize")
        .tokenUri("https://github.com/login/oauth/access_token")
        .userInfoUri("https://api.github.com/user")
        .userNameAttributeName("login")
        .build()

    private fun githubResolver() = OAuth2ProviderResolver(
        defaultProvider = "github",
        profiles = listOf(githubProfile)
    )

    private fun googleRegistration(): ClientRegistration = ClientRegistration.withRegistrationId("google")
        .clientId("course-app-google")
        .clientSecret("secret")
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
        .redirectUri("http://localhost/login/oauth2/code/google")
        .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
        .tokenUri("https://oauth2.googleapis.com/token")
        .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo")
        .userNameAttributeName("sub")
        .build()

    private fun googleResolver() = OAuth2ProviderResolver(
        defaultProvider = "google",
        profiles = listOf(googleProfile)
    )

    @Test
    fun `normalizes github oauth2 attributes and maps authorities`() {
        val now = Instant.now()
        val registration = githubRegistration()

        val request = OAuth2UserRequest(
            registration,
            OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "access-token", now, now.plusSeconds(300))
        )

        val delegateUser = DefaultOAuth2User(
            listOf(SimpleGrantedAuthority("OAUTH2_USER")),
            mapOf(
                "id" to 12345L,
                "login" to "octocat",
                "user" to mapOf(
                    "email" to "octocat@github.com",
                    "name" to "The Octocat"
                )
            ),
            "login"
        )

        val service = ProviderAwareOAuth2UserService(
            providerResolver = githubResolver(),
            adapters = listOf(GitHubClaimsAdapter()).associateBy { it.providerId },
            authorityMapper = OAuth2AuthorityMapper(),
            delegate = OAuth2UserService<OAuth2UserRequest, OAuth2User> { delegateUser }
        )

        val loadedUser = service.loadUser(request)

        assertThat(loadedUser.getAttribute<String>("provider")).isEqualTo("github")
        assertThat(loadedUser.getAttribute<String>("subject")).isEqualTo("12345")
        assertThat(loadedUser.getAttribute<String>("username")).isEqualTo("octocat")
        assertThat(loadedUser.getAttribute<String>("email")).isEqualTo("octocat@github.com")
        assertThat(loadedUser.getAttribute<String>("name")).isEqualTo("The Octocat")
        assertThat(loadedUser.authorities.map { it.authority }).contains(
            "OAUTH2_USER",
            "ROLE_GUEST",
            "COURSE_VIEW",
            "TAG_VIEW",
            "AUTHOR_VIEW"
        )
    }

    @Test
    fun `enriches github email from fallback when profile email is missing`() {
        val now = Instant.now()
        val request = OAuth2UserRequest(
            githubRegistration(),
            OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "github-token", now, now.plusSeconds(300))
        )

        val delegateUser = DefaultOAuth2User(
            listOf(SimpleGrantedAuthority("OAUTH2_USER")),
            mapOf(
                "id" to 12345L,
                "login" to "octocat",
                "name" to "The Octocat"
            ),
            "login"
        )

        val service = ProviderAwareOAuth2UserService(
            providerResolver = githubResolver(),
            adapters = listOf(GitHubClaimsAdapter()).associateBy { it.providerId },
            authorityMapper = OAuth2AuthorityMapper(),
            delegate = OAuth2UserService<OAuth2UserRequest, OAuth2User> { delegateUser },
            githubEmailLookup = {
                listOf(
                    GitHubEmailAddress("verified-secondary@github.com", primary = false, verified = true),
                    GitHubEmailAddress("primary-verified@github.com", primary = true, verified = true),
                    GitHubEmailAddress("unverified@github.com", primary = true, verified = false)
                )
            }
        )

        val loadedUser = service.loadUser(request)

        assertThat(loadedUser.getAttribute<String>("email")).isEqualTo("primary-verified@github.com")
    }

    @Test
    fun `nested user info attributes override conflicting top level values`() {
        val now = Instant.now()
        val request = OAuth2UserRequest(
            githubRegistration(),
            OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "github-token", now, now.plusSeconds(300))
        )

        val lookupCalls = AtomicInteger(0)

        val delegateUser = DefaultOAuth2User(
            listOf(SimpleGrantedAuthority("OAUTH2_USER")),
            mapOf(
                "id" to 12345L,
                "login" to "top-level-login",
                "email" to "top-level@github.com",
                "user" to mapOf(
                    "login" to "nested-login",
                    "email" to "nested@github.com"
                )
            ),
            "login"
        )

        val service = ProviderAwareOAuth2UserService(
            providerResolver = githubResolver(),
            adapters = listOf(GitHubClaimsAdapter()).associateBy { it.providerId },
            authorityMapper = OAuth2AuthorityMapper(),
            delegate = OAuth2UserService<OAuth2UserRequest, OAuth2User> { delegateUser },
            githubEmailLookup = {
                lookupCalls.incrementAndGet()
                emptyList()
            }
        )

        val loadedUser = service.loadUser(request)

        assertThat(loadedUser.getAttribute<String>("username")).isEqualTo("nested-login")
        assertThat(loadedUser.getAttribute<String>("email")).isEqualTo("nested@github.com")
        assertThat(lookupCalls.get()).isZero()
    }

    @Test
    fun `uses verified github email when no primary verified email exists`() {
        val now = Instant.now()
        val request = OAuth2UserRequest(
            githubRegistration(),
            OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "github-token", now, now.plusSeconds(300))
        )

        val delegateUser = DefaultOAuth2User(
            listOf(SimpleGrantedAuthority("OAUTH2_USER")),
            mapOf(
                "id" to 12345L,
                "login" to "octocat"
            ),
            "login"
        )

        val service = ProviderAwareOAuth2UserService(
            providerResolver = githubResolver(),
            adapters = listOf(GitHubClaimsAdapter()).associateBy { it.providerId },
            authorityMapper = OAuth2AuthorityMapper(),
            delegate = OAuth2UserService<OAuth2UserRequest, OAuth2User> { delegateUser },
            githubEmailLookup = {
                listOf(
                    GitHubEmailAddress("unverified-primary@github.com", primary = true, verified = false),
                    GitHubEmailAddress("verified-secondary@github.com", primary = false, verified = true)
                )
            }
        )

        val loadedUser = service.loadUser(request)

        assertThat(loadedUser.getAttribute<String>("email")).isEqualTo("verified-secondary@github.com")
    }

    @Test
    fun `does not call github fallback when email claim is already present`() {
        val now = Instant.now()
        val request = OAuth2UserRequest(
            githubRegistration(),
            OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "github-token", now, now.plusSeconds(300))
        )

        val lookupCalls = AtomicInteger(0)

        val delegateUser = DefaultOAuth2User(
            listOf(SimpleGrantedAuthority("OAUTH2_USER")),
            mapOf(
                "id" to 12345L,
                "login" to "octocat",
                "email" to "already-present@github.com"
            ),
            "login"
        )

        val service = ProviderAwareOAuth2UserService(
            providerResolver = githubResolver(),
            adapters = listOf(GitHubClaimsAdapter()).associateBy { it.providerId },
            authorityMapper = OAuth2AuthorityMapper(),
            delegate = OAuth2UserService<OAuth2UserRequest, OAuth2User> { delegateUser },
            githubEmailLookup = {
                lookupCalls.incrementAndGet()
                listOf(GitHubEmailAddress("fallback@github.com", primary = true, verified = true))
            }
        )

        val loadedUser = service.loadUser(request)

        assertThat(loadedUser.getAttribute<String>("email")).isEqualTo("already-present@github.com")
        assertThat(lookupCalls.get()).isZero()
    }

    @Test
    fun `does not call github fallback for non github provider`() {
        val now = Instant.now()
        val request = OAuth2UserRequest(
            googleRegistration(),
            OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "google-token", now, now.plusSeconds(300))
        )

        val lookupCalls = AtomicInteger(0)

        val delegateUser = DefaultOAuth2User(
            listOf(SimpleGrantedAuthority("OAUTH2_USER")),
            mapOf(
                "sub" to "google-sub-123",
                "email" to "user@gmail.com"
            ),
            "sub"
        )

        val service = ProviderAwareOAuth2UserService(
            providerResolver = googleResolver(),
            adapters = listOf(GoogleClaimsAdapter()).associateBy { it.providerId },
            authorityMapper = OAuth2AuthorityMapper(),
            delegate = OAuth2UserService<OAuth2UserRequest, OAuth2User> { delegateUser },
            githubEmailLookup = {
                lookupCalls.incrementAndGet()
                emptyList()
            }
        )

        val loadedUser = service.loadUser(request)

        assertThat(loadedUser.getAttribute<String>("provider")).isEqualTo("google")
        assertThat(loadedUser.getAttribute<String>("email")).isEqualTo("user@gmail.com")
        assertThat(lookupCalls.get()).isZero()
    }

    @Test
    fun `github fallback lookup exception does not escape oauth user loading`() {
        val now = Instant.now()
        val request = OAuth2UserRequest(
            githubRegistration(),
            OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "github-token", now, now.plusSeconds(300))
        )

        val delegateUser = DefaultOAuth2User(
            listOf(SimpleGrantedAuthority("OAUTH2_USER")),
            mapOf(
                "id" to 12345L,
                "login" to "octocat"
            ),
            "login"
        )

        val service = ProviderAwareOAuth2UserService(
            providerResolver = githubResolver(),
            adapters = listOf(GitHubClaimsAdapter()).associateBy { it.providerId },
            authorityMapper = OAuth2AuthorityMapper(),
            delegate = OAuth2UserService<OAuth2UserRequest, OAuth2User> { delegateUser },
            githubEmailLookup = { throw RuntimeException("github email API failure") }
        )

        assertThatThrownBy { service.loadUser(request) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("GitHub email claim is required")
    }

    @Test
    fun `does not enrich github email when fallback returns no verified emails`() {
        val now = Instant.now()
        val request = OAuth2UserRequest(
            githubRegistration(),
            OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "github-token", now, now.plusSeconds(300))
        )

        val delegateUser = DefaultOAuth2User(
            listOf(SimpleGrantedAuthority("OAUTH2_USER")),
            mapOf(
                "id" to 12345L,
                "login" to "octocat"
            ),
            "login"
        )

        val service = ProviderAwareOAuth2UserService(
            providerResolver = githubResolver(),
            adapters = listOf(GitHubClaimsAdapter()).associateBy { it.providerId },
            authorityMapper = OAuth2AuthorityMapper(),
            delegate = OAuth2UserService<OAuth2UserRequest, OAuth2User> { delegateUser },
            githubEmailLookup = {
                listOf(
                    GitHubEmailAddress("primary-unverified@github.com", primary = true, verified = false),
                    GitHubEmailAddress("secondary-unverified@github.com", primary = false, verified = false)
                )
            }
        )

        assertThatThrownBy { service.loadUser(request) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("GitHub email claim is required")
    }
}