package com.itsz.app.service

import com.itsz.app.domain.BaseEntity
import com.itsz.app.event.DomainEventPublisher
import com.itsz.app.event.EntityType
import com.itsz.app.event.EventProvider
import com.itsz.app.event.OperationEvent
import com.itsz.app.event.OperationType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.transaction.annotation.Transactional
import java.util.Optional

abstract class EntityCrudService<T : BaseEntity>(
    private val repository: JpaRepository<T, Long>,
    private val eventPublisher: DomainEventPublisher,
    private val entityType: EntityType,
    private val entityLabel: String,
    private val nameExtractor: (T) -> String?
) {

    val createEventProvider = EventProvider<T> { entity, entityName, initiatedBy ->
        OperationEvent.constructCreateEvent(
            entity,
            entityName,
            initiatedBy
        )
    }

    val updateEventProvider = EventProvider<T> { entity, entityName, initiatedBy ->
        OperationEvent.constructUpdateEvent(
            entity,
            entityName,
            initiatedBy
        )
    }

    val deleteEventProvider = EventProvider<T> { entity, entityName, initiatedBy ->
        OperationEvent.constructDeleteEvent(
            entity,
            entityName,
            initiatedBy
        )
    }

    open fun getAll(): List<T> = repository.findAll()

    open fun getById(id: Long): Optional<T> = repository.findById(id)

    @Transactional
    open fun create(entity: T) = create(entity, createEventProvider)

    private fun create(entity: T, eventProvider: EventProvider<T>): T {
        val prepared = prepareForCreate(entity)
        val saved = repository.save(prepared)
        val event = eventProvider.toEvent(entity, nameExtractor(entity), currentUser())
        eventPublisher.publish(event)
        return saved
    }

    @Transactional
    open fun update(id: Long, entity: T) = update(id, entity, updateEventProvider)

    private fun update(id: Long, entity: T, eventProvider: EventProvider<T>): T {
        val existing = repository.findById(id).orElseThrow {
            RuntimeException(notFoundMessage(id))
        }
        val prepared = prepareForUpdate(existing, entity, id)
        val saved = repository.save(prepared)
        val event = eventProvider.toEvent(entity, nameExtractor(entity), currentUser())
        eventPublisher.publish(event)
        return saved
    }

    @Transactional
    open fun delete(id: Long) = delete(id, deleteEventProvider)

    private fun delete(id: Long , eventProvider: EventProvider<T>) {
        val existing = repository.findById(id).orElseThrow {
            RuntimeException(notFoundMessage(id))
        }
        repository.deleteById(id)
        val event = eventProvider.toEvent(existing, nameExtractor(existing), currentUser())
        eventPublisher.publish(event)
    }

    protected open fun prepareForCreate(entity: T): T = entity

    protected open fun prepareForUpdate(existing: T, incoming: T, id: Long): T = assignId(incoming, id)

    protected open fun assignId(entity: T, id: Long): T = entity

    protected open fun notFoundMessage(id: Long): String = "$entityLabel not found with id: $id"

    protected open fun currentUser(): String? =
        SecurityContextHolder.getContext().authentication?.name

}
