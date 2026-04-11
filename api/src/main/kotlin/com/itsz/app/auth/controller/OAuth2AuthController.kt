package com.itsz.app.auth.controller

import com.itsz.app.auth.service.UserService
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames
import org.springframework.web.bind.annotation.*
import org.springframework.web.client.RestTemplate
import org.springframework.web.util.UriComponentsBuilder
import jakarta.servlet.http.HttpServletResponse

@RestController
@RequestMapping("/api/auth/oauth2")
class OAuth2AuthController(
    private val clientRegistrationRepository: ClientRegistrationRepository,
    @Value("\${spring.security.oauth2.client.provider.keycloak.authorization-uri}")
    private val authorizationUri: String,
    @Value("\${spring.security.oauth2.client.registration.keycloak.client-id}")
    private val clientId: String,
    @Value("\${spring.security.oauth2.client.registration.keycloak.scope}")
    private val scope: String,
    @Value("\${server.port:8081}")
    private val serverPort: String,
    @Value("\${app.oauth2.frontend-url:http://localhost:3000}")
    private val frontendUrl: String
) {

    private val logger = LoggerFactory.getLogger(OAuth2AuthController::class.java)

    /**
     * Initiates OAuth2 authorization code flow by redirecting to Keycloak login page
     */
    @GetMapping("/login")
    fun oauth2Login(response: HttpServletResponse) {
        // Convert comma-separated scopes to space-separated (OAuth2 spec)
        val formattedScope = scope.replace(",", " ")

        val authorizationRequestUri = UriComponentsBuilder
            .fromUriString(authorizationUri)
            .queryParam(OAuth2ParameterNames.RESPONSE_TYPE, "code")
            .queryParam(OAuth2ParameterNames.CLIENT_ID, clientId)
            .queryParam(OAuth2ParameterNames.SCOPE, formattedScope)
            .queryParam(OAuth2ParameterNames.REDIRECT_URI, "http://localhost:$serverPort/api/auth/oauth2/callback")
            .queryParam(OAuth2ParameterNames.STATE, frontendUrl)
            .build()
            .toUriString()

        response.sendRedirect(authorizationRequestUri)
    }

    /**
     * Handles OAuth2 callback from Keycloak and redirects to frontend with code or error
     */
    @GetMapping("/callback")
    fun oauth2Callback(
        @RequestParam(required = false) code: String?,
        @RequestParam(required = false) error: String?,
        @RequestParam(required = false, name = "error_description") errorDescription: String?,
        @RequestParam(required = false) state: String?,
        response: HttpServletResponse
    ) {
        logger.info("OAuth2 callback received - code: ${code?.take(10)}..., error: $error, state: $state")
        
        val frontendRedirectUri = state ?: "http://localhost:3000"
        
        val redirectUrlBuilder = UriComponentsBuilder
            .fromUriString(frontendRedirectUri)
            .path("/oauth2/callback")
        
        // Check for errors first
        if (error != null) {
            logger.warn("OAuth2 callback error: $error - $errorDescription")
            redirectUrlBuilder
                .queryParam("error", error)
                .queryParam("error_description", errorDescription ?: "OAuth2 authentication failed")
        } else if (code != null) {
            // Success - redirect with authorization code
            logger.info("OAuth2 callback successful, redirecting to frontend")
            redirectUrlBuilder.queryParam("code", code)
        } else {
            // No code and no error - invalid callback
            logger.error("OAuth2 callback received without code or error")
            redirectUrlBuilder
                .queryParam("error", "invalid_callback")
                .queryParam("error_description", "No authorization code or error received")
        }
        
        val redirectUrl = redirectUrlBuilder.build().toUriString()
        logger.debug("Redirecting to: $redirectUrl")
        response.sendRedirect(redirectUrl)
    }

    /**
     * Exchange authorization code for access token
     */
    @PostMapping("/exchange")
    fun exchangeCodeForToken(@RequestBody request: TokenExchangeRequest): ResponseEntity<OAuth2TokenResponse> {
        val clientRegistration = clientRegistrationRepository.findByRegistrationId("keycloak")
        
        val tokenUri = clientRegistration.providerDetails.tokenUri
        val restTemplate = RestTemplate()
        
        // Build token request with proper URL encoding
        val tokenRequestBody = org.springframework.util.LinkedMultiValueMap<String, String>().apply {
            add(OAuth2ParameterNames.GRANT_TYPE, "authorization_code")
            add(OAuth2ParameterNames.CODE, request.code)
            add(OAuth2ParameterNames.REDIRECT_URI, "http://localhost:$serverPort/api/auth/oauth2/callback")
            add(OAuth2ParameterNames.CLIENT_ID, clientId)
            add(OAuth2ParameterNames.CLIENT_SECRET, clientRegistration.clientSecret)
        }

        val headers = org.springframework.http.HttpHeaders()
        headers.contentType = org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED

        val httpEntity = org.springframework.http.HttpEntity(tokenRequestBody, headers)
        
        try {
            val tokenResponse = restTemplate.postForEntity(
                tokenUri,
                httpEntity,
                Map::class.java
            )
            
            val responseBody = tokenResponse.body as Map<*, *>
            val accessToken = responseBody["access_token"] as String
            val idToken = responseBody["id_token"] as String?
            val refreshToken = responseBody["refresh_token"] as String?
            val expiresIn = (responseBody["expires_in"] as? Number)?.toLong()
            
            // Extract user info from token (you can also call userinfo endpoint)
            val userInfo = extractUserInfoFromToken(idToken ?: accessToken)
            
            return ResponseEntity.ok(
                OAuth2TokenResponse(
                    accessToken = accessToken,
                    idToken = idToken,
                    refreshToken = refreshToken,
                    expiresIn = expiresIn,
                    tokenType = responseBody["token_type"] as? String ?: "Bearer",
                    user = userInfo
                )
            )
        } catch (e: Exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Extract basic user info from JWT token without full validation
     * For production, consider calling the userinfo endpoint instead
     */
    private fun extractUserInfoFromToken(token: String): UserInfo {
        try {
            // Decode JWT payload (without signature verification for simplicity)
            val parts = token.split(".")
            if (parts.size < 2) {
                return UserInfo("unknown", "unknown@example.com")
            }
            
            val payload = String(java.util.Base64.getUrlDecoder().decode(parts[1]))
            val json = com.fasterxml.jackson.module.kotlin.jacksonObjectMapper().readValue(payload, Map::class.java)
            
            return UserInfo(
                name = json["preferred_username"] as? String ?: json["name"] as? String ?: "unknown",
                email = json["email"] as? String ?: "unknown@example.com"
            )
        } catch (e: Exception) {
            return UserInfo("unknown", "unknown@example.com")
        }
    }

    /**
     * Refresh access token using refresh token
     */
    @PostMapping("/refresh")
    fun refreshToken(@RequestBody request: RefreshTokenRequest): ResponseEntity<OAuth2TokenResponse> {
        val clientRegistration = clientRegistrationRepository.findByRegistrationId("keycloak")
        val tokenUri = clientRegistration.providerDetails.tokenUri
        val restTemplate = RestTemplate()
        
        val tokenRequestBody = org.springframework.util.LinkedMultiValueMap<String, String>().apply {
            add(OAuth2ParameterNames.GRANT_TYPE, "refresh_token")
            add(OAuth2ParameterNames.REFRESH_TOKEN, request.refreshToken)
            add(OAuth2ParameterNames.CLIENT_ID, clientId)
            add(OAuth2ParameterNames.CLIENT_SECRET, clientRegistration.clientSecret)
        }

        val headers = org.springframework.http.HttpHeaders()
        headers.contentType = org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED

        val httpEntity = org.springframework.http.HttpEntity(tokenRequestBody, headers)
        
        try {
            val tokenResponse = restTemplate.postForEntity(
                tokenUri,
                httpEntity,
                Map::class.java
            )
            
            val responseBody = tokenResponse.body as Map<*, *>
            val accessToken = responseBody["access_token"] as String
            val idToken = responseBody["id_token"] as String?
            val refreshToken = responseBody["refresh_token"] as String?
            val expiresIn = (responseBody["expires_in"] as? Number)?.toLong()
            
            val userInfo = extractUserInfoFromToken(idToken ?: accessToken)
            
            return ResponseEntity.ok(
                OAuth2TokenResponse(
                    accessToken = accessToken,
                    idToken = idToken,
                    refreshToken = refreshToken,
                    expiresIn = expiresIn,
                    tokenType = responseBody["token_type"] as? String ?: "Bearer",
                    user = userInfo
                )
            )
        } catch (e: Exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }
    }

    /**
     * Diagnostic endpoint to check OAuth2 configuration
     */
    @GetMapping("/config")
    fun getOAuth2Config(): ResponseEntity<Map<String, Any>> {
        try {
            val clientRegistration = clientRegistrationRepository.findByRegistrationId("keycloak")
            
            val config = mapOf(
                "clientId" to clientId,
                "authorizationUri" to authorizationUri,
                "tokenUri" to clientRegistration.providerDetails.tokenUri,
                "redirectUri" to "http://localhost:$serverPort/api/auth/oauth2/callback",
                "scope" to scope,
                "issuerUri" to (clientRegistration.providerDetails.issuerUri ?: "not configured"),
                "status" to "configured"
            )
            
            return ResponseEntity.ok(config)
        } catch (e: Exception) {
            return ResponseEntity.ok(
                mapOf(
                    "status" to "error",
                    "message" to (e.message ?: "Failed to load OAuth2 configuration"),
                    "error" to e.javaClass.simpleName
                )
            )
        }
    }
}

data class TokenExchangeRequest(val code: String)

data class RefreshTokenRequest(val refreshToken: String)

data class OAuth2TokenResponse(
    val accessToken: String,
    val idToken: String?,
    val refreshToken: String?,
    val expiresIn: Long?,
    val tokenType: String,
    val user: UserInfo
)
