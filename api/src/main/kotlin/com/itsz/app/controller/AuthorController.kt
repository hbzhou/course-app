package com.itsz.app.controller

import com.itsz.app.domain.Author
import com.itsz.app.service.AuthorService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/authors")
class AuthorController(private val authorService: AuthorService) {

    @GetMapping
    @PreAuthorize("hasAuthority('COURSE_VIEW')")
    fun getAllAuthors(): List<Author> = authorService.getAll()

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_VIEW')")
    fun getAuthorById(@PathVariable id: Long): ResponseEntity<Author> {
        return authorService.getById(id)
            .map { ResponseEntity.ok(it) }
            .orElse(ResponseEntity.notFound().build())
    }

    @PostMapping
    @PreAuthorize("hasAuthority('COURSE_EDIT')")
    fun createAuthor(@RequestBody author: Author): ResponseEntity<Author> {
        val createdAuthor = authorService.create(author)
        return ResponseEntity.status(HttpStatus.CREATED).body(createdAuthor)
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_EDIT')")
    fun updateAuthor(@PathVariable id: Long, @RequestBody author: Author): ResponseEntity<Author> =
        ResponseEntity.ok(authorService.update(id, author))

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_EDIT')")
    fun deleteAuthor(@PathVariable id: Long): ResponseEntity<Void> {
        authorService.delete(id)
        return ResponseEntity.noContent().build()
    }
}
