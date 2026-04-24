package com.itsz.app.config

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.MessageBuilder
import org.springframework.security.authentication.AnonymousAuthenticationToken
import org.springframework.security.authentication.TestingAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority

class WebSocketAuthChannelInterceptorTest {

    @Test
    fun `accepts authenticated session principal`() {
        val interceptor = WebSocketAuthChannelInterceptor()

        val accessor = StompHeaderAccessor.create(StompCommand.CONNECT)
        accessor.user = TestingAuthenticationToken("session-user", "n/a", "COURSE_VIEW").apply { isAuthenticated = true }
        val message = MessageBuilder.createMessage("".toByteArray(), accessor.messageHeaders)

        val result = interceptor.preSend(message, Mockito.mock(MessageChannel::class.java))

        requireNotNull(result)
        val resultAccessor = StompHeaderAccessor.wrap(result)
        assertThat(resultAccessor.user?.name).isEqualTo("session-user")
    }

    @Test
    fun `rejects anonymous connect`() {
        val interceptor = WebSocketAuthChannelInterceptor()

        val accessor = StompHeaderAccessor.create(StompCommand.CONNECT)
        accessor.user = AnonymousAuthenticationToken(
            "key",
            "anonymous",
            listOf(SimpleGrantedAuthority("ROLE_ANONYMOUS"))
        )
        val message = MessageBuilder.createMessage("".toByteArray(), accessor.messageHeaders)

        assertThatThrownBy { interceptor.preSend(message, Mockito.mock(MessageChannel::class.java)) }
            .hasMessageContaining("WebSocket CONNECT requires an authenticated session")
    }

    @Test
    fun `rejects connect with null principal`() {
        val interceptor = WebSocketAuthChannelInterceptor()

        val accessor = StompHeaderAccessor.create(StompCommand.CONNECT)
        // No user set — null principal
        val message = MessageBuilder.createMessage("".toByteArray(), accessor.messageHeaders)

        assertThatThrownBy { interceptor.preSend(message, Mockito.mock(MessageChannel::class.java)) }
            .hasMessageContaining("WebSocket CONNECT requires an authenticated session")
    }
}
