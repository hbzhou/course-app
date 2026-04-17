package com.itsz.app.config

import com.itsz.app.auth.jwt.JwtAuthFilter
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtValidators
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.web.util.matcher.RequestMatcher

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
class SecurityConfig(
    private val userDetailsService: UserDetailsService,
    private val jwtAuthFilter: JwtAuthFilter,
    @Value("\${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
    private val jwkSetUri: String,
    @Value("\${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private val issuerUri: String,
    @Value("\${app.oauth2.success-url}")
    private val successUrl: String
) {

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun authenticationManager(http: HttpSecurity): AuthenticationManager {
        val builder = http.getSharedObject(AuthenticationManagerBuilder::class.java)
        builder.userDetailsService(userDetailsService).passwordEncoder(passwordEncoder())
        return builder.build()
    }

    @Bean
    fun keycloakJwtDecoder(): JwtDecoder {
        val decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build()
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuerUri))
        return decoder
    }

    @Bean
    fun keycloakAuthorityMapper(): KeycloakAuthorityMapper = KeycloakAuthorityMapper()

    @Bean
    fun keycloakJwtConverter(keycloakAuthorityMapper: KeycloakAuthorityMapper): KeycloakJwtAuthenticationConverter {
        return KeycloakJwtAuthenticationConverter(keycloakAuthorityMapper)
    }

    @Bean
    fun keycloakOidcUserService(
        keycloakJwtDecoder: JwtDecoder,
        keycloakAuthorityMapper: KeycloakAuthorityMapper
    ): org.springframework.security.oauth2.client.userinfo.OAuth2UserService<OidcUserRequest, OidcUser> {
        return KeycloakOidcUserService(keycloakJwtDecoder, keycloakAuthorityMapper)
    }

    @Bean
    fun securityFilterChain(
        http: HttpSecurity,
        keycloakAuthorityMapper: KeycloakAuthorityMapper,
        keycloakJwtConverter: KeycloakJwtAuthenticationConverter,
        keycloakOidcUserService: org.springframework.security.oauth2.client.userinfo.OAuth2UserService<OidcUserRequest, OidcUser>
    ): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .authorizeHttpRequests {
                it
                    // Swagger UI / OpenAPI
                    .requestMatchers(
                        "/",
                        "/assets/**",
                        "/v3/api-docs/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                        "/error",
                        "/**/*.html", "/**/*.css", "/**/*.js","/**/*.png", "/**/*.jpg", "/**/*.jpeg", "/**/*.gif", "/**/*.svg", "/**/*.ico",
                    ).permitAll()
                    .requestMatchers("/actuator/health/**").permitAll()
                    .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/logout").permitAll()
                    .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                    .requestMatchers("/ws/**").permitAll()
                    .anyRequest().authenticated()
            }
            .oauth2Login { oauth2 ->
                oauth2.userInfoEndpoint { userInfo ->
                    userInfo.userAuthoritiesMapper(keycloakAuthorityMapper)
                    userInfo.oidcUserService(keycloakOidcUserService)
                }
                oauth2.defaultSuccessUrl(successUrl, true)
            }
            .exceptionHandling { exceptions ->
                val oauth2EntryPoint = LoginUrlAuthenticationEntryPoint("/oauth2/authorization/keycloak")
                oauth2EntryPoint.setFavorRelativeUris(false)
                exceptions.defaultAuthenticationEntryPointFor(
                    oauth2EntryPoint,
                    RequestMatcher { request -> request.requestURI == "/courses" }
                )
            }
            // OAuth2 Resource Server - validates JWT tokens from Keycloak
            .oauth2ResourceServer { oauth2 ->
                oauth2.jwt { jwt ->
                    jwt.jwtAuthenticationConverter(keycloakJwtConverter)
                }
            }
            // Keep legacy JWT filter for backwards compatibility during migration
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }
}