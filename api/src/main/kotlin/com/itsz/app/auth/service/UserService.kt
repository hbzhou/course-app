package com.itsz.app.auth.service

import com.itsz.app.auth.model.User
import com.itsz.app.auth.repository.UserRepository
import com.itsz.app.event.DomainEventPublisher
import com.itsz.app.event.EntityType
import com.itsz.app.service.EntityCrudService
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class UserService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    eventPublisher: DomainEventPublisher
) : EntityCrudService<User, Long>(
    userRepository,
    eventPublisher,
    EntityType.USER,
    "User",
    idExtractor = { it.id?.toString() },
    nameExtractor = { it.username }
) {

    fun getAllUsers(): List<User> = getAll()

    fun getUserById(id: Long): Optional<User> = getById(id)

    fun getUserByUsername(username: String): User? = userRepository.findByUsername(username).orElse(null)

    @Transactional
    fun createUser(user: User): User = create(user)

    @Transactional
    fun updateUser(id: Long, user: User): User = update(id, user)

    @Transactional
    fun deleteUser(id: Long) = delete(id)

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
}
