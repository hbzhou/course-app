package com.itsz.app.service

import com.itsz.app.event.DomainEventPublisher
import com.itsz.app.event.EntityType
import com.itsz.app.event.OperationEvent
import com.itsz.app.event.OperationType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.transaction.annotation.Transactional
import java.util.Optional

abstract class EntityCrudService<T>(
    private val repository: JpaRepository<T, Long>,
    private val eventPublisher: DomainEventPublisher,
    private val entityType: EntityType,
    private val entityLabel: String,
    private val idExtractor: (T) -> String?,
    private val nameExtractor: (T) -> String?,
    private val idToString: (Long) -> String = { it.toString() }
) {

    open fun getAll(): List<T> = repository.findAll()

    open fun getById(id: Long): Optional<T> = repository.findById(id)

    @Transactional
    open fun create(entity: T): T {
        val prepared = prepareForCreate(entity)
        val saved = repository.save(prepared)
        publish(OperationType.CREATED, saved, null)
        return saved
    }

    @Transactional
    open fun update(id: Long, entity: T): T {
        val existing = repository.findById(id).orElseThrow {
            RuntimeException(notFoundMessage(id))
        }
        val prepared = prepareForUpdate(existing, entity, id)
        val saved = repository.save(prepared)
        publish(OperationType.UPDATED, saved, idToString(id))
        return saved
    }

    @Transactional
    open fun delete(id: Long) {
        val existing = repository.findById(id).orElseThrow {
            RuntimeException(notFoundMessage(id))
        }
        repository.deleteById(id)
        publish(OperationType.DELETED, existing, idToString(id))
    }

    protected open fun prepareForCreate(entity: T): T = entity

    protected open fun prepareForUpdate(existing: T, incoming: T, id: Long): T = assignId(incoming, id)

    protected open fun assignId(entity: T, id: Long): T = entity

    protected open fun notFoundMessage(id: Long): String = "$entityLabel not found with id: $id"

    protected open fun currentUser(): String? =
        SecurityContextHolder.getContext().authentication?.name

    private fun publish(operation: OperationType, entity: T, fallbackId: String?) {
        val event = OperationEvent(
            entityType = entityType,
            operation = operation,
            entityId = idExtractor(entity) ?: fallbackId,
            entityName = nameExtractor(entity),
            initiatedBy = currentUser()
        )
        eventPublisher.publish(event)
    }
}
