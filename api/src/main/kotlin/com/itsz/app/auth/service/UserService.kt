package com.itsz.app.auth.service

import com.itsz.app.auth.model.User
import com.itsz.app.auth.repository.UserRepository
import com.itsz.app.event.DomainEventPublisher
import com.itsz.app.event.EntityType
import com.itsz.app.event.OperationEvent
import com.itsz.app.event.OperationType
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class UserService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val eventPublisher: DomainEventPublisher
) {

    fun getAllUsers(): List<User> = userRepository.findAll()

    fun getUserById(id: Long): Optional<User> = userRepository.findById(id)

    fun getUserByUsername(username: String): User? = userRepository.findByUsername(username).orElse(null)

    @Transactional
    fun createUser(user: User): User {
        val encodedPassword = user.password?.let { passwordEncoder.encode(it) }
        val saved = userRepository.save(user.copy(password = encodedPassword))
        eventPublisher.publish(
            OperationEvent(
                entityType = EntityType.USER,
                operation = OperationType.CREATED,
                entityId = saved.id?.toString(),
                entityName = saved.username,
                initiatedBy = currentUser()
            )
        )
        return saved
    }

    @Transactional
    fun updateUser(id: Long, user: User): User {
        return if (userRepository.existsById(id)) {
            val existingUser = userRepository.findById(id).get()
            val updatedUser = if (user.password.isNullOrBlank()) {
                user.copy(id = id, password = existingUser.password)
            } else {
                user.copy(id = id, password = passwordEncoder.encode(user.password))
            }
            val saved = userRepository.save(updatedUser)
            eventPublisher.publish(
                OperationEvent(
                    entityType = EntityType.USER,
                    operation = OperationType.UPDATED,
                    entityId = id.toString(),
                    entityName = saved.username,
                    initiatedBy = currentUser()
                )
            )
            saved
        } else {
            throw RuntimeException("User not found with id: $id")
        }
    }

    @Transactional
    fun deleteUser(id: Long) {
        if (userRepository.existsById(id)) {
            val user = userRepository.findById(id).get()
            userRepository.deleteById(id)
            eventPublisher.publish(
                OperationEvent(
                    entityType = EntityType.USER,
                    operation = OperationType.DELETED,
                    entityId = id.toString(),
                    entityName = user.username,
                    initiatedBy = currentUser()
                )
            )
        } else {
            throw RuntimeException("User not found with id: $id")
        }
    }

    private fun currentUser(): String? =
        SecurityContextHolder.getContext().authentication?.name
}
