package com.itsz.app.notification

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Lazy
import org.springframework.data.redis.connection.Message
import org.springframework.data.redis.connection.MessageListener
import org.springframework.messaging.core.AbstractMessageSendingTemplate
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component

@Component
class RedisNotificationSubscriber(val messagingTemplate: SimpMessagingTemplate) : MessageListener {
        private val log = LoggerFactory.getLogger(RedisNotificationSubscriber::class.java)

    override fun onMessage(message: Message, pattern: ByteArray?) {
        val payload = String(message.body)
        log.info("Received from Redis, broadcasting via WebSocket: {}", payload)
        messagingTemplate.convertAndSend("/topic/notifications", payload)
    }
}

