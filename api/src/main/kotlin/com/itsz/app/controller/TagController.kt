package com.itsz.app.controller

import com.itsz.app.domain.Tag
import com.itsz.app.service.TagService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/tags")
class TagController(private val tagService: TagService) {

    @GetMapping
    @PreAuthorize("hasAuthority('TAG_VIEW')")
    fun getAll(): List<Tag> = tagService.getAll()

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('TAG_VIEW')")
    fun getById(@PathVariable id: Long): ResponseEntity<Tag> =
        tagService.getById(id).map { ResponseEntity.ok(it) }
            .orElse(ResponseEntity.notFound().build())

    @PostMapping
    @PreAuthorize("hasAuthority('TAG_EDIT')")
    fun create(@RequestBody tag: Tag): ResponseEntity<Tag> =
        ResponseEntity.status(HttpStatus.CREATED).body(tagService.create(tag))

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('TAG_EDIT')")
    fun update(@PathVariable id: Long, @RequestBody tag: Tag): ResponseEntity<Tag> =
        ResponseEntity.ok(tagService.update(id, tag))

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('TAG_EDIT')")
    fun delete(@PathVariable id: Long): ResponseEntity<Void> {
        tagService.delete(id)
        return ResponseEntity.noContent().build()
    }
}
