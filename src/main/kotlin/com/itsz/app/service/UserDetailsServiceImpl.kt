package com.itsz.app.service

import com.itsz.app.repository.UserRepository
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

@Service
class UserDetailsServiceImpl(private val userRepository: UserRepository) : UserDetailsService {

    override fun loadUserByUsername(username: String): UserDetails {
        val user = userRepository.findByUsername(username)
            .orElseThrow { UsernameNotFoundException("User not found with username: $username") }

        val authorities = buildSet {
            // keep role-based auth working
            user.roles.forEach { add(SimpleGrantedAuthority(it.name)) }
            // add fine-grained permissions
            user.roles.flatMap { it.permissions }.forEach { add(SimpleGrantedAuthority(it.name)) }
        }.toList()

        return User(
            user.username,
            user.password,
            authorities
        )
    }
}
