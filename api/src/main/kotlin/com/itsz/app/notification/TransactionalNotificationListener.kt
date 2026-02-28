package com.itsz.app.notification

import tools.jackson.databind.ObjectMapper
import com.itsz.app.event.OperationEvent
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Component
import org.springframework.transaction.event.TransactionPhase
import org.springframework.transaction.event.TransactionalEventListener

@Component
class TransactionalNotificationListener(
    private val redisTemplate: StringRedisTemplate,
    private val objectMapper: ObjectMapper,
    @Value("\${app.notification.redis-channel}") private val redisChannel: String
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    fun onOperationEvent(event: OperationEvent) {
        try {
            val message = objectMapper.writeValueAsString(
                NotificationMessage(
                    entityType = event.entityType.name,
                    operation = event.operation.name,
                    entityId = event.entityId,
                    entityName = event.entityName,
                    initiatedBy = event.initiatedBy,
                    timestamp = event.timestamp
                )
            )
            redisTemplate.convertAndSend(redisChannel, message)
            log.info("Published notification to Redis channel '{}': {}", redisChannel, message)
        } catch (ex: Exception) {
            log.error("Failed to publish notification for event: {}", event, ex)
        }
    }
}

