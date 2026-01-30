package com.itsz.app.service

import com.itsz.app.domain.User
import com.itsz.app.repository.UserRepository
import org.springframework.stereotype.Service
import java.util.*

@Service
class UserService(private val userRepository: UserRepository) {

    fun getAllUsers(): List<User> = userRepository.findAll()

    fun getUserById(id: Long): Optional<User> = userRepository.findById(id)

    fun getUserByUsername(username: String): User? = userRepository.findByUsername(username).orElse(null)

    fun createUser(user: User): User = userRepository.save(user)

    fun updateUser(id: Long, user: User): User {
        return if (userRepository.existsById(id)) {
            userRepository.save(user.copy(id = id))
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

