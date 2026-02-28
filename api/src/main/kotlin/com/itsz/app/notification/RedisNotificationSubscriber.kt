package com.itsz.app.notification

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Lazy
import org.springframework.data.redis.connection.Message
import org.springframework.data.redis.connection.MessageListener
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component

@Component
class RedisNotificationSubscriber : MessageListener {

    @Lazy
    @Autowired
    private lateinit var messagingTemplate: SimpMessagingTemplate

    private val log = LoggerFactory.getLogger(javaClass)

    override fun onMessage(message: Message, pattern: ByteArray?) {
        val payload = String(message.body)
        log.info("Received from Redis, broadcasting via WebSocket: {}", payload)
        messagingTemplate.convertAndSend("/topic/notifications", payload)
    }
}

