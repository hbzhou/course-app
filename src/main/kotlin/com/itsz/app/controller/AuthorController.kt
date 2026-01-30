package com.itsz.app.controller

import com.itsz.app.domain.Author
import com.itsz.app.service.AuthorService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/authors")
class AuthorController(private val authorService: AuthorService) {

    @GetMapping
    @PreAuthorize("hasAuthority('COURSE_VIEW')")
    fun getAllAuthors(): List<Author> = authorService.getAllAuthors()

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_VIEW')")
    fun getAuthorById(@PathVariable id: String): ResponseEntity<Author> {
        return authorService.getAuthorById(id)
            .map { ResponseEntity.ok(it) }
            .orElse(ResponseEntity.notFound().build())
    }

    @PostMapping
    @PreAuthorize("hasAuthority('COURSE_EDIT')")
    fun createAuthor(@RequestBody author: Author): ResponseEntity<Author> {
        val createdAuthor = authorService.createAuthor(author)
        return ResponseEntity.status(HttpStatus.CREATED).body(createdAuthor)
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_EDIT')")
    fun updateAuthor(@PathVariable id: String, @RequestBody author: Author): ResponseEntity<Author> {
        return try {
            val updatedAuthor = authorService.updateAuthor(id, author)
            ResponseEntity.ok(updatedAuthor)
        } catch (_: RuntimeException) {
            ResponseEntity.notFound().build()
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_EDIT')")
    fun deleteAuthor(@PathVariable id: String): ResponseEntity<Void> {
        return try {
            authorService.deleteAuthor(id)
            ResponseEntity.noContent().build()
        } catch (_: RuntimeException) {
            ResponseEntity.notFound().build()
        }
    }
}
