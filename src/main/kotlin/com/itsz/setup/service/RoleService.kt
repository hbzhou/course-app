package com.itsz.setup.service

import com.itsz.setup.domain.Role
import com.itsz.setup.repository.RoleRepository
import org.springframework.stereotype.Service
import java.util.*

@Service
class RoleService(private val roleRepository: RoleRepository) {

    fun getAllRoles(): List<Role> = roleRepository.findAll()

    fun getRoleById(id: Long): Optional<Role> = roleRepository.findById(id)

    fun createRole(role: Role): Role = roleRepository.save(role)

    fun updateRole(id: Long, role: Role): Role {
        return if (roleRepository.existsById(id)) {
            roleRepository.save(role.copy(id = id))
        } else {
            throw RuntimeException("Role not found with id: $id")
        }
    }

    fun deleteRole(id: Long) {
        if (roleRepository.existsById(id)) {
            roleRepository.deleteById(id)
        } else {
            throw RuntimeException("Role not found with id: $id")
        }
    }
}

