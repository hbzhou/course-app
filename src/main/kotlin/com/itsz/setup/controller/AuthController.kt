package com.itsz.setup.controller

import com.itsz.setup.dto.LoginRequest
import com.itsz.setup.dto.LoginResponse
import com.itsz.setup.dto.RegisterRequest
import com.itsz.setup.auth.JwtService
import com.itsz.setup.service.UserService
import com.itsz.setup.domain.User
import com.itsz.setup.repository.RoleRepository
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping()
class AuthController(
    private val authenticationManager: AuthenticationManager,
    private val userDetailsService: UserDetailsService,
    private val jwtService: JwtService,
    private val userService: UserService,
    private val roleRepository: RoleRepository,
    private val passwordEncoder: PasswordEncoder
) {

    @PostMapping("/login")
    fun login(@RequestBody loginRequest: LoginRequest): LoginResponse {
        authenticationManager.authenticate(
            UsernamePasswordAuthenticationToken(loginRequest.username, loginRequest.password)
        )
        val userDetails = userDetailsService.loadUserByUsername(loginRequest.username)
        val token = jwtService.generateToken(userDetails)
        return LoginResponse(token)
    }

    @PostMapping("/register")
    fun register(@RequestBody registerRequest: RegisterRequest): User {
        val userRole = roleRepository.findByName("ROLE_USER").orElseThrow { RuntimeException("Role not found") }
        val user = User(
            username = registerRequest.username,
            email = registerRequest.email,
            password = passwordEncoder.encode(registerRequest.password),
            roles = setOf(userRole)
        )
        return userService.createUser(user)
    }
}

