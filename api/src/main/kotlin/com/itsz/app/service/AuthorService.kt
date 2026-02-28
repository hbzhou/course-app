package com.itsz.app.service

import com.itsz.app.domain.Author
import com.itsz.app.event.DomainEventPublisher
import com.itsz.app.event.EntityType
import com.itsz.app.event.OperationEvent
import com.itsz.app.event.OperationType
import com.itsz.app.repository.AuthorRepository
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class AuthorService(
    private val authorRepository: AuthorRepository,
    private val eventPublisher: DomainEventPublisher
) {

    fun getAllAuthors(): List<Author> = authorRepository.findAll()

    fun getAuthorById(id: String): Optional<Author> = authorRepository.findById(id)

    @Transactional
    fun createAuthor(author: Author): Author {
        val saved = authorRepository.save(author)
        eventPublisher.publish(
            OperationEvent(
                entityType = EntityType.AUTHOR,
                operation = OperationType.CREATED,
                entityId = saved.id,
                entityName = saved.name,
                initiatedBy = currentUser()
            )
        )
        return saved
    }

    @Transactional
    fun updateAuthor(id: String, author: Author): Author {
        return if (authorRepository.existsById(id)) {
            val saved = authorRepository.save(author.copy(id = id))
            eventPublisher.publish(
                OperationEvent(
                    entityType = EntityType.AUTHOR,
                    operation = OperationType.UPDATED,
                    entityId = saved.id,
                    entityName = saved.name,
                    initiatedBy = currentUser()
                )
            )
            saved
        } else {
            throw RuntimeException("Author not found with id: $id")
        }
    }

    @Transactional
    fun deleteAuthor(id: String) {
        if (authorRepository.existsById(id)) {
            val author = authorRepository.findById(id).get()
            authorRepository.deleteById(id)
            eventPublisher.publish(
                OperationEvent(
                    entityType = EntityType.AUTHOR,
                    operation = OperationType.DELETED,
                    entityId = id,
                    entityName = author.name,
                    initiatedBy = currentUser()
                )
            )
        } else {
            throw RuntimeException("Author not found with id: $id")
        }
    }

    private fun currentUser(): String? =
        SecurityContextHolder.getContext().authentication?.name
}
