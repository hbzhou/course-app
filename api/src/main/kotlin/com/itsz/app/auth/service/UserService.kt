package com.itsz.app.auth.service

import com.itsz.app.auth.model.User
import com.itsz.app.auth.repository.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import java.util.*

@Service
class UserService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder
) {

    fun getAllUsers(): List<User> = userRepository.findAll()

    fun getUserById(id: Long): Optional<User> = userRepository.findById(id)

    fun getUserByUsername(username: String): User? = userRepository.findByUsername(username).orElse(null)

    fun createUser(user: User): User {
        val encodedPassword = user.password?.let { passwordEncoder.encode(it) }
        return userRepository.save(user.copy(password = encodedPassword))
    }

    fun updateUser(id: Long, user: User): User {
        return if (userRepository.existsById(id)) {
            val existingUser = userRepository.findById(id).get()
            val updatedUser = if (user.password.isNullOrBlank()) {
                // Keep existing password if no new password provided
                user.copy(id = id, password = existingUser.password)
            } else {
                // Encode new password
                user.copy(id = id, password = passwordEncoder.encode(user.password))
            }
            userRepository.save(updatedUser)
        } else {
            throw RuntimeException("User not found with id: $id")
        }
    }

    fun deleteUser(id: Long) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id)
        } else {
            throw RuntimeException("User not found with id: $id")
        }
    }
}

