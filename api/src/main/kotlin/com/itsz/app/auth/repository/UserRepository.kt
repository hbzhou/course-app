package com.itsz.app.auth.repository

import com.itsz.app.auth.model.User
import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional

interface UserRepository : JpaRepository<User, Long> {
    fun findByUsername(username: String): Optional<User>
}

