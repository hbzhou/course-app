package com.itsz.app.service

import com.itsz.app.domain.Author
import com.itsz.app.event.DomainEventPublisher
import com.itsz.app.repository.AuthorRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class AuthorService(
    authorRepository: AuthorRepository,
    eventPublisher: DomainEventPublisher
) : EntityCrudService<Author>(
    authorRepository,
    eventPublisher,
    nameExtractor = { it.name }
) {

    fun getAllAuthors(): List<Author> = getAll()

    fun getAuthorById(id: Long): Optional<Author> = getById(id)

    @Transactional
    fun createAuthor(author: Author): Author = create(author)

    @Transactional
    fun updateAuthor(id: Long, author: Author): Author = update(id, author)

    @Transactional
    fun deleteAuthor(id: Long) = delete(id)

    override fun assignId(entity: Author, id: Long): Author = entity.copy(id = id)
}
