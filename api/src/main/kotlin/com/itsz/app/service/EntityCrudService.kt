package com.itsz.app.service

import com.itsz.app.domain.BaseEntity
import com.itsz.app.exception.EntityNotFoundException
import com.itsz.app.event.DomainEventPublisher
import com.itsz.app.event.EventProvider
import com.itsz.app.event.EventProviders
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.transaction.annotation.Transactional
import java.util.Optional

abstract class EntityCrudService<T : BaseEntity> {
    abstract val repository: JpaRepository<T, Long>
    abstract val nameExtractor: (T) -> String?
    @Autowired
    open lateinit var eventPublisher: DomainEventPublisher

    open fun getAll(): List<T> = repository.findAll()

    open fun getById(id: Long): Optional<T> = repository.findById(id)

    @Transactional
    open fun create(entity: T) = create(entity, EventProviders.createEventProvider)

    private fun create(entity: T, eventProvider: EventProvider<T>): T {
        val prepared = prepareForCreate(entity)
        val saved = repository.save(prepared)
        val event = eventProvider.toEvent(saved, nameExtractor(saved), currentUser())
        eventPublisher.publish(event)
        return saved
    }

    @Transactional
    open fun update(id: Long, entity: T) = update(id, entity, EventProviders.updateEventProvider)

    private fun update(id: Long, entity: T, eventProvider: EventProvider<T>): T {
        val existing = repository.findById(id).orElseThrow {
            EntityNotFoundException(entityName(), id)
        }
        val prepared = prepareForUpdate(existing, entity, id)
        val saved = repository.save(prepared)
        val event = eventProvider.toEvent(saved, nameExtractor(saved), currentUser())
        eventPublisher.publish(event)
        return saved
    }

    @Transactional
    open fun delete(id: Long) = delete(id, EventProviders.deleteEventProvider)

    private fun delete(id: Long, eventProvider: EventProvider<T>) {
        val existing = repository.findById(id).orElseThrow {
            EntityNotFoundException(entityName(), id)
        }
        repository.deleteById(id)
        val event = eventProvider.toEvent(existing, nameExtractor(existing), currentUser())
        eventPublisher.publish(event)
    }

    protected open fun prepareForCreate(entity: T): T = entity

    protected open fun prepareForUpdate(existing: T, incoming: T, id: Long): T = assignId(incoming, id)

    protected open fun assignId(entity: T, id: Long): T = entity

    protected open fun notFoundMessage(id: Long): String = "Not found with id: $id"

    protected open fun entityName(): String = "Entity"

    protected open fun currentUser(): String? =
        SecurityContextHolder.getContext().authentication?.name

}
