package com.itsz.app.auth.controller

import com.itsz.app.auth.jwt.JwtService
import com.itsz.app.auth.model.User
import com.itsz.app.auth.repository.RoleRepository
import com.itsz.app.auth.service.UserService
import com.itsz.app.exception.ResourceNotFoundException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.*

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
            ?: throw ResourceNotFoundException("User not found")
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
        val userRole = roleRepository.findByName("ROLE_USER").orElseThrow { ResourceNotFoundException("Role not found") }
        val user = User(
            username = registerRequest.username,
            email = registerRequest.email,
            password = passwordEncoder.encode(registerRequest.password),
            roles = setOf(userRole)
        )
        return userService.create(user)
    }

    @GetMapping("/me")
    fun me(authentication: Authentication?): ResponseEntity<Map<String, String>> {
        if (authentication == null || !authentication.isAuthenticated) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }

        val principal = authentication.principal
        return when (principal) {
            is Jwt -> ResponseEntity.ok(
                mapOf(
                    "name" to (principal.subject ?: "unknown"),
                    "email" to (principal.getClaimAsString("email") ?: "unknown@example.com"),
                    "authType" to "bearer"
                )
            )
            is OAuth2User -> ResponseEntity.ok(
                mapOf(
                    "name" to (principal.getAttribute<String>("preferred_username") ?: principal.name),
                    "email" to (principal.getAttribute<String>("email") ?: "unknown@example.com"),
                    "authType" to "oauth2"
                )
            )
            else -> ResponseEntity.ok(
                mapOf(
                    "name" to authentication.name,
                    "email" to "unknown@example.com",
                    "authType" to "session"
                )
            )
        }
    }

    @DeleteMapping("/logout")
    fun logout(request: HttpServletRequest, response: HttpServletResponse): ResponseEntity<Void> {
        request.getSession(false)?.invalidate()
        SecurityContextHolder.clearContext()
        response.setHeader("Clear-Site-Data", "\"cookies\"")
        return ResponseEntity.ok().build()
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


