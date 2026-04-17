package com.itsz.app.auth.jwt

import com.itsz.app.auth.service.UserDetailsServiceImpl
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse

@Component
class JwtAuthFilter(
    private val userDetailsService: UserDetailsServiceImpl,
    private val jwtService: JwtService
) : OncePerRequestFilter() {

    private val logger = LoggerFactory.getLogger(JwtAuthFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response)
            return
        }

        val jwt = authHeader.substring(7)

        // Try to process as legacy JWT - if it fails, let OAuth2 resource server handle it
        try {
            val username = jwtService.extractUsername(jwt)

            if (SecurityContextHolder.getContext().authentication == null) {
                val userDetails = userDetailsService.loadUserByUsername(username)
                if (jwtService.isTokenValid(jwt, userDetails)) {
                    val authToken = UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.authorities
                    )
                    SecurityContextHolder.getContext().authentication = authToken
                    logger.debug("Authenticated user with legacy JWT: $username")
                }
            }
        } catch (e: Exception) {
            // Token is not a legacy JWT (likely OAuth2 token with RS256)
            // Let it pass through to OAuth2 resource server filter
            logger.debug("Token is not a legacy JWT, will be processed by OAuth2 resource server: ${e.javaClass.simpleName}")
        }
        
        filterChain.doFilter(request, response)
    }
}
