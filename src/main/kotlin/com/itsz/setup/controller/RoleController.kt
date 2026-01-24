package com.itsz.setup.controller

import com.itsz.setup.domain.Role
import com.itsz.setup.service.RoleService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/roles")
class RoleController(private val roleService: RoleService) {

    @GetMapping
    fun getAllRoles(): List<Role> = roleService.getAllRoles()

    @GetMapping("/{id}")
    fun getRoleById(@PathVariable id: Long): ResponseEntity<Role> {
        return roleService.getRoleById(id)
            .map { ResponseEntity.ok(it) }
            .orElse(ResponseEntity.notFound().build())
    }

    @PostMapping
    fun createRole(@RequestBody role: Role): ResponseEntity<Role> {
        val createdRole = roleService.createRole(role)
        return ResponseEntity.status(HttpStatus.CREATED).body(createdRole)
    }

    @PutMapping("/{id}")
    fun updateRole(@PathVariable id: Long, @RequestBody role: Role): ResponseEntity<Role> {
        return try {
            val updatedRole = roleService.updateRole(id, role)
            ResponseEntity.ok(updatedRole)
        } catch (e: RuntimeException) {
            ResponseEntity.notFound().build()
        }
    }

    @DeleteMapping("/{id}")
    fun deleteRole(@PathVariable id: Long): ResponseEntity<Void> {
        return try {
            roleService.deleteRole(id)
            ResponseEntity.noContent().build()
        } catch (e: RuntimeException) {
            ResponseEntity.notFound().build()
        }
    }
}

