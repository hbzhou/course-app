package com.itsz.app.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer

@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig(
    private val webSocketAuthChannelInterceptor: WebSocketAuthChannelInterceptor,
    @Value("\${app.websocket.allowed-origins:http://localhost:3000}")
    private val allowedOriginPatterns: String
) : WebSocketMessageBrokerConfigurer {

    override fun configureMessageBroker(registry: MessageBrokerRegistry) {
        // Enable a simple in-memory broker for /topic destinations
        registry.enableSimpleBroker("/topic")
        // Prefix for messages bound for @MessageMapping methods
        registry.setApplicationDestinationPrefixes("/app")
    }

    override fun configureClientInboundChannel(registration: ChannelRegistration) {
        registration.interceptors(webSocketAuthChannelInterceptor)
    }

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        // Native WebSocket endpoint (used by modern browsers via @stomp/stompjs brokerURL)
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns(*allowedOriginPatterns.split(',').map { it.trim() }.filter { it.isNotEmpty() }.toTypedArray())
    }
}

