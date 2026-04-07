package com.itsz.app.auth.service

import com.itsz.app.auth.model.User
import com.itsz.app.auth.repository.UserRepository
import com.itsz.app.service.EntityCrudService
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

@Service
class UserService(override val repository: UserRepository, private val passwordEncoder: PasswordEncoder, override val nameExtractor: (User) -> String = { it.username }) : EntityCrudService<User>() {


    fun getUserByUsername(username: String): User? = repository.findByUsername(username).orElse(null)

    override fun prepareForCreate(entity: User): User {
        val encodedPassword = entity.password?.let { passwordEncoder.encode(it) }
        return entity.copy(password = encodedPassword)
    }

    override fun prepareForUpdate(existing: User, incoming: User, id: Long): User {
        val password = if (incoming.password.isNullOrBlank()) {
            existing.password
        } else {
            passwordEncoder.encode(incoming.password)
        }
        return incoming.copy(id = id, password = password)
    }

    override fun entityName(): String = "User"
}
