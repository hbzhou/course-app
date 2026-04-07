package com.itsz.app.config

import com.itsz.app.auth.jwt.JwtService
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.messaging.support.MessageHeaderAccessor
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.stereotype.Component

@Component
class WebSocketAuthChannelInterceptor(
    private val jwtService: JwtService,
    private val userDetailsService: UserDetailsService
) : ChannelInterceptor {

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

            val username = try {
                jwtService.extractUsername(token)
            } catch (_: Exception) {
                throw BadCredentialsException("Invalid JWT token")
            }

            val userDetails = userDetailsService.loadUserByUsername(username)
            if (!jwtService.isTokenValid(token, userDetails)) {
                throw BadCredentialsException("Invalid JWT token")
            }

            accessor.user = UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.authorities
            )
        }

        return message
    }
}
