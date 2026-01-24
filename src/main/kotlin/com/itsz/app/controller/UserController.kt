package com.itsz.app.controller

import com.itsz.app.domain.User
import com.itsz.app.service.UserService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/users")
class UserController(private val userService: UserService) {

    @GetMapping
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    fun getAllUsers(): List<User> = userService.getAllUsers()

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    fun getUserById(@PathVariable id: Long): ResponseEntity<User> {
        return userService.getUserById(id)
            .map { ResponseEntity.ok(it) }
            .orElse(ResponseEntity.notFound().build())
    }

    @PostMapping
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    fun createUser(@RequestBody user: User): ResponseEntity<User> {
        val createdUser = userService.createUser(user)
        return ResponseEntity.status(HttpStatus.CREATED).body(createdUser)
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    fun updateUser(@PathVariable id: Long, @RequestBody user: User): ResponseEntity<User> {
        return try {
            val updatedUser = userService.updateUser(id, user)
            ResponseEntity.ok(updatedUser)
        } catch (_: RuntimeException) {
            ResponseEntity.notFound().build()
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    fun deleteUser(@PathVariable id: Long): ResponseEntity<Void> {
        return try {
            userService.deleteUser(id)
            ResponseEntity.noContent().build()
        } catch (_: RuntimeException) {
            ResponseEntity.notFound().build()
        }
    }
}
