package com.itsz.app.config

import com.itsz.app.auth.jwt.JwtService
import org.slf4j.LoggerFactory
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.messaging.support.MessageHeaderAccessor
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.stereotype.Component

@Component
class WebSocketAuthChannelInterceptor(
    private val jwtService: JwtService,
    private val userDetailsService: UserDetailsService,
    private val keycloakJwtDecoder: JwtDecoder,
    private val keycloakJwtConverter: KeycloakJwtAuthenticationConverter
) : ChannelInterceptor {

    private val logger = LoggerFactory.getLogger(WebSocketAuthChannelInterceptor::class.java)

    override fun preSend(message: Message<*>, channel: MessageChannel): Message<*>? {
        val accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor::class.java)
            ?: return message

        if (accessor.command == StompCommand.CONNECT) {
            val rawHeader = accessor.getFirstNativeHeader("Authorization")
                ?: throw BadCredentialsException("Missing Authorization header")
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
                // Try as OAuth2 JWT (RS256 from Keycloak)
                try {
                    val jwt = keycloakJwtDecoder.decode(token)
                    val auth = keycloakJwtConverter.convert(jwt)
                    logger.debug("WebSocket authenticated with OAuth2 JWT: ${jwt.subject}")
                    auth
                } catch (oauth2Error: Exception) {
                    logger.error("WebSocket authentication failed for both legacy and OAuth2 JWT: ${oauth2Error.message}")
                    throw BadCredentialsException("Invalid JWT token - not recognized as legacy or OAuth2 token")
                }
            }

            accessor.user = authentication
        }

        return message
    }
}
