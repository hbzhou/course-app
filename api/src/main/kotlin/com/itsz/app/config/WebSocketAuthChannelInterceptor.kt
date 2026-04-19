package com.itsz.app.config

import com.itsz.app.auth.oauth2.ProviderAwareJwtAuthenticationConverter
import com.itsz.app.auth.jwt.JwtService
import org.slf4j.LoggerFactory
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.messaging.support.MessageHeaderAccessor
import org.springframework.security.authentication.AnonymousAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.stereotype.Component

@Component
class WebSocketAuthChannelInterceptor(
    private val jwtService: JwtService,
    private val userDetailsService: UserDetailsService,
    private val jwtDecoders: List<JwtDecoder>,
    private val jwtAuthenticationConverter: ProviderAwareJwtAuthenticationConverter
) : ChannelInterceptor {

    private val logger = LoggerFactory.getLogger(WebSocketAuthChannelInterceptor::class.java)

    override fun preSend(message: Message<*>, channel: MessageChannel): Message<*>? {
        val accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor::class.java)
            ?: return message

        if (accessor.command == StompCommand.CONNECT) {
            val existingPrincipal = accessor.user as? Authentication
            val hasAuthenticatedNonAnonymousPrincipal =
                existingPrincipal?.isAuthenticated == true && existingPrincipal !is AnonymousAuthenticationToken

            if (hasAuthenticatedNonAnonymousPrincipal) {
                logger.debug("WebSocket CONNECT accepted with existing authenticated principal: ${existingPrincipal.name}")
                return message
            }

            val rawHeader = accessor.getFirstNativeHeader("Authorization")
            if (rawHeader == null) {
                if (existingPrincipal is AnonymousAuthenticationToken) {
                    throw BadCredentialsException("Anonymous CONNECT requires Authorization header")
                }
                logger.debug("WebSocket CONNECT without Authorization header; proceeding for session-backed authentication")
                return message
            }

            val token = rawHeader.removePrefix("Bearer ").trim()

            if (token.isBlank()) {
                throw BadCredentialsException("Missing JWT token")
            }

            // Try legacy JWT first, then OAuth2 JWT
            val authentication = try {
                // Try as legacy JWT (HS256)
                val username = jwtService.extractUsername(token)
                val userDetails = userDetailsService.loadUserByUsername(username)
                if (!jwtService.isTokenValid(token, userDetails)) {
                    throw BadCredentialsException("Invalid JWT token")
                }
                logger.debug("WebSocket authenticated with legacy JWT: $username")
                UsernamePasswordAuthenticationToken(userDetails, null, userDetails.authorities)
            } catch (e: Exception) {
                // Fallback to provider-aware OAuth2 JWT decode path.
                val oauth2Auth = jwtDecoders.asSequence().mapNotNull { decoder ->
                    runCatching {
                        val jwt = decoder.decode(token)
                        logger.debug("WebSocket authenticated with OAuth2 JWT: ${jwt.subject}")
                        jwtAuthenticationConverter.convert(jwt)
                    }.getOrNull()
                }.firstOrNull()

                oauth2Auth ?: throw BadCredentialsException("Invalid JWT token - not recognized as legacy or OAuth2 token")
            }

            accessor.user = authentication
        }

        return message
    }
}
