package com.itsz.app.event

import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Component

@Component
class DomainEventPublisher(private val applicationEventPublisher: ApplicationEventPublisher) {

    fun publish(event: OperationEvent) {
        applicationEventPublisher.publishEvent(event)
    }
}

