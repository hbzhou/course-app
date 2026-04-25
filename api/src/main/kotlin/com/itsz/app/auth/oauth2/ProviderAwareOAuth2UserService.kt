package com.itsz.app.auth.oauth2

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.user.DefaultOAuth2User
import org.springframework.security.oauth2.core.user.OAuth2User
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

data class GitHubEmailAddress(
    val email: String?,
    val primary: Boolean = false,
    val verified: Boolean = false
)

private val githubHttpClient: HttpClient = HttpClient.newHttpClient()
private val githubObjectMapper = ObjectMapper()
private val githubEmailLookupTimeout: Duration = Duration.ofSeconds(5)

private fun defaultGitHubEmailLookup(accessToken: String): List<GitHubEmailAddress> {
    if (accessToken.isBlank()) return emptyList()

    return try {
        val request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.github.com/user/emails"))
            .header("Authorization", "Bearer $accessToken")
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .timeout(githubEmailLookupTimeout)
            .GET()
            .build()

        val response = githubHttpClient.send(request, HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() !in 200..299) {
            return emptyList()
        }

        val emailItems: List<Map<String, Any?>> = githubObjectMapper.readValue(
            response.body(),
            object : TypeReference<List<Map<String, Any?>>>() {}
        )

        emailItems.map { item ->
            GitHubEmailAddress(
                email = item["email"] as? String,
                primary = item["primary"] as? Boolean ?: false,
                verified = item["verified"] as? Boolean ?: false
            )
        }
    } catch (_: Exception) {
        emptyList()
    }
}

class ProviderAwareOAuth2UserService(
    private val providerResolver: OAuth2ProviderResolver,
    private val adapters: Map<String, OAuth2ClaimsAdapter>,
    private val authorityMapper: OAuth2AuthorityMapper,
    private val delegate: OAuth2UserService<OAuth2UserRequest, OAuth2User> = DefaultOAuth2UserService(),
    private val githubEmailLookup: (String) -> List<GitHubEmailAddress> = ::defaultGitHubEmailLookup
) : OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    override fun loadUser(userRequest: OAuth2UserRequest): OAuth2User {
        val oauth2User = delegate.loadUser(userRequest)
        val profile = providerResolver.requireByRegistrationId(userRequest.clientRegistration.registrationId)

        val mergedClaims = linkedMapOf<String, Any?>().apply {
            putAll(oauth2User.attributes)
            putAll(extractProviderUserInfoAttributes(oauth2User.attributes))
        }
        ensureSubjectClaim(mergedClaims)
        enrichGitHubEmailIfMissing(profile.providerId, mergedClaims, userRequest.accessToken.tokenValue)

        val normalized = adapters.getValue(profile.providerId).normalize(mergedClaims, profile)
        val mappedAuthorities = authorityMapper.map(normalized, oauth2User.authorities, profile)

        return DefaultOAuth2User(mappedAuthorities, normalized.toAttributes(), "username")
    }

    private fun extractProviderUserInfoAttributes(attributes: Map<String, Any?>): Map<String, Any?> {
        val candidates = listOf("user", "user_info", "userinfo")
        return candidates.asSequence()
            .mapNotNull { key -> attributes[key] as? Map<*, *> }
            .flatMap { nested -> nested.entries.asSequence() }
            .mapNotNull { (key, value) -> (key as? String)?.let { it to value } }
            .toMap()
    }

    private fun enrichGitHubEmailIfMissing(
        providerId: String,
        claims: MutableMap<String, Any?>,
        accessToken: String?
    ) {
        if (!providerId.equals("github", ignoreCase = true)) return
        if (stringClaim(claims["email"]) != null) return

        val token = accessToken?.trim().orEmpty()
        if (token.isBlank()) return

        val emails = try {
            githubEmailLookup(token)
        } catch (_: Exception) {
            emptyList()
        }

        val preferredEmail = emails.asSequence()
            .mapNotNull { email ->
                stringClaim(email.email)?.let { value ->
                    Triple(value, email.primary, email.verified)
                }
            }
            .firstOrNull { (_, primary, verified) -> primary && verified }
            ?.first
            ?: emails.asSequence()
                .mapNotNull { email ->
                    stringClaim(email.email)?.takeIf { email.verified }
                }
                .firstOrNull()

        if (preferredEmail != null) {
            claims["email"] = preferredEmail
        }
    }

    private fun stringClaim(value: Any?): String? = (value as? String)?.trim()?.takeIf { it.isNotBlank() }

    private fun ensureSubjectClaim(claims: MutableMap<String, Any?>) {
        val existingSub = (claims["sub"] as? String)?.trim().orEmpty()
        if (existingSub.isNotBlank()) return

        val derivedSub = sequenceOf(claims["id"], claims["user_id"], claims["node_id"])
            .mapNotNull { claimValue ->
                when (claimValue) {
                    is String -> claimValue.trim().takeIf { it.isNotBlank() }
                    null -> null
                    else -> claimValue.toString().takeIf { it.isNotBlank() }
                }
            }
            .firstOrNull()

        if (derivedSub != null) {
            claims["sub"] = derivedSub
        }
    }
}