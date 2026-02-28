package com.itsz.app.auth.controller

import com.itsz.app.auth.jwt.JwtService
import com.itsz.app.auth.model.User
import com.itsz.app.auth.repository.RoleRepository
import com.itsz.app.auth.service.UserService
import com.oracle.svm.core.annotate.Delete
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.net.http.HttpResponse

@RestController
@RequestMapping("/api/auth")
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
        val user = userService.getUserByUsername(loginRequest.username)
            ?: throw RuntimeException("User not found")
        val userDetails = userDetailsService.loadUserByUsername(loginRequest.username)
        val token = jwtService.generateToken(userDetails)

        return LoginResponse(
            token = token,
            user = UserInfo(
                name = user.username,
                email = user.email
            )
        )
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

    @DeleteMapping("/logout")
    fun logout() : ResponseEntity<Void> {
        return ResponseEntity(HttpStatus.OK)
    }
}


data class LoginRequest(val username: String, val password: String)

data class LoginResponse(
    val token: String,  // JWT token
    val user: UserInfo
)

data class UserInfo(
    val name: String,
    val email: String
)

data class RegisterRequest(val username: String, val email: String, val password: String)


