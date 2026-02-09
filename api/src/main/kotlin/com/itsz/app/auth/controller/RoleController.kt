package com.itsz.app.auth.controller

import com.itsz.app.auth.model.Role
import com.itsz.app.auth.service.RoleService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/roles")
class RoleController(private val roleService: RoleService) {

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    fun getAllRoles(): List<Role> = roleService.getAllRoles()

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    fun getRoleById(@PathVariable id: Long): ResponseEntity<Role> {
        return roleService.getRoleById(id)
            .map { ResponseEntity.ok(it) }
            .orElse(ResponseEntity.notFound().build())
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    fun createRole(@RequestBody role: Role): ResponseEntity<Role> {
        val createdRole = roleService.createRole(role)
        return ResponseEntity.status(HttpStatus.CREATED).body(createdRole)
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    fun updateRole(@PathVariable id: Long, @RequestBody role: Role): ResponseEntity<Role> {
        return try {
            val updatedRole = roleService.updateRole(id, role)
            ResponseEntity.ok(updatedRole)
        } catch (_: RuntimeException) {
            ResponseEntity.notFound().build()
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    fun deleteRole(@PathVariable id: Long): ResponseEntity<Void> {
        return try {
            roleService.deleteRole(id)
            ResponseEntity.noContent().build()
        } catch (_: RuntimeException) {
            ResponseEntity.notFound().build()
        }
    }
}
