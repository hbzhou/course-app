package com.itsz.app.config

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
import org.springframework.stereotype.Component

@Component
class WebSocketAuthChannelInterceptor : ChannelInterceptor {

    private val logger = LoggerFactory.getLogger(WebSocketAuthChannelInterceptor::class.java)

    override fun preSend(message: Message<*>, channel: MessageChannel): Message<*>? {
        val accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor::class.java)
            ?: return message

        if (accessor.command == StompCommand.CONNECT) {
            val principal = accessor.user as? Authentication

            if (principal == null || !principal.isAuthenticated || principal is AnonymousAuthenticationToken) {
                throw BadCredentialsException("WebSocket CONNECT requires an authenticated session")
            }

            logger.debug("WebSocket CONNECT accepted for session principal: ${principal.name}")
        }

        return message
    }
}
