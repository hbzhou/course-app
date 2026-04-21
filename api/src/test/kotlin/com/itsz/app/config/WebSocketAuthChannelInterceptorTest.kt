package com.itsz.app.config

import com.itsz.app.auth.jwt.JwtService
import com.itsz.app.auth.oauth2.ProviderAwareJwtAuthenticationConverter
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.MessageBuilder
import org.springframework.security.authentication.AnonymousAuthenticationToken
import org.springframework.security.authentication.TestingAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.oauth2.jwt.JwtDecoder

class WebSocketAuthChannelInterceptorTest {

    @Test
    fun `keeps existing authenticated session principal without bearer header`() {
        val interceptor = WebSocketAuthChannelInterceptor(
            jwtService = Mockito.mock(JwtService::class.java),
            userDetailsService = Mockito.mock(UserDetailsService::class.java),
            jwtDecoders = listOf(Mockito.mock(JwtDecoder::class.java)),
            jwtAuthenticationConverter = Mockito.mock(ProviderAwareJwtAuthenticationConverter::class.java)
        )

        val accessor = StompHeaderAccessor.create(StompCommand.CONNECT)
        accessor.user = TestingAuthenticationToken("session-user", "n/a", "COURSE_VIEW").apply { isAuthenticated = true }
        val message = MessageBuilder.createMessage("".toByteArray(), accessor.messageHeaders)

        val result = interceptor.preSend(message, Mockito.mock(MessageChannel::class.java))

        requireNotNull(result)
        val resultAccessor = StompHeaderAccessor.wrap(result)
        assertThat(resultAccessor.user?.name).isEqualTo("session-user")
    }

    @Test
    fun `rejects anonymous connect without authorization header`() {
        val interceptor = WebSocketAuthChannelInterceptor(
            jwtService = Mockito.mock(JwtService::class.java),
            userDetailsService = Mockito.mock(UserDetailsService::class.java),
            jwtDecoders = listOf(Mockito.mock(JwtDecoder::class.java)),
            jwtAuthenticationConverter = Mockito.mock(ProviderAwareJwtAuthenticationConverter::class.java)
        )

        val accessor = StompHeaderAccessor.create(StompCommand.CONNECT)
        accessor.user = AnonymousAuthenticationToken(
            "key",
            "anonymous",
            listOf(SimpleGrantedAuthority("ROLE_ANONYMOUS"))
        )
        val message: Message<ByteArray> = MessageBuilder.createMessage("".toByteArray(), accessor.messageHeaders)

        assertThatThrownBy { interceptor.preSend(message, Mockito.mock(MessageChannel::class.java)) }
            .hasMessageContaining("Anonymous CONNECT requires Authorization header")
    }

}
