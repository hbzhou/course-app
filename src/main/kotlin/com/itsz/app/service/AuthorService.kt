package com.itsz.app.service

import com.itsz.app.domain.Author
import com.itsz.app.repository.AuthorRepository
import org.springframework.stereotype.Service
import java.util.*

@Service
class AuthorService(private val authorRepository: AuthorRepository) {

    fun getAllAuthors(): List<Author> = authorRepository.findAll()

    fun getAuthorById(id: String): Optional<Author> = authorRepository.findById(id)

    fun createAuthor(author: Author): Author = authorRepository.save(author)

    fun updateAuthor(id: String, author: Author): Author {
        return if (authorRepository.existsById(id)) {
            authorRepository.save(author.copy(id = id))
        } else {
            throw RuntimeException("Author not found with id: $id")
        }
    }

    fun deleteAuthor(id: String) {
        if (authorRepository.existsById(id)) {
            authorRepository.deleteById(id)
        } else {
            throw RuntimeException("Author not found with id: $id")
        }
    }
}
