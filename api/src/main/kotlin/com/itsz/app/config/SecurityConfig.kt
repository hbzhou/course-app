package com.itsz.app.config

import com.itsz.app.auth.oauth2.AzureAdClaimsAdapter
import com.itsz.app.auth.oauth2.KeycloakClaimsAdapter
import com.itsz.app.auth.oauth2.OAuth2AuthorityMapper
import com.itsz.app.auth.oauth2.OAuth2ClaimsAdapter
import com.itsz.app.auth.oauth2.OAuth2ProviderProperties
import com.itsz.app.auth.oauth2.OAuth2ProviderResolver
import com.itsz.app.auth.oauth2.ProviderAwareJwtAuthenticationConverter
import com.itsz.app.auth.oauth2.ProviderAwareOidcUserService
import com.itsz.app.auth.jwt.JwtAuthFilter
import org.springframework.boot.context.properties.EnableConfigurationProperties
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
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.web.util.matcher.RequestMatcher

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@EnableConfigurationProperties(OAuth2ProviderProperties::class)
class SecurityConfig(
    private val userDetailsService: UserDetailsService,
    private val jwtAuthFilter: JwtAuthFilter,
    private val oauth2ProviderProperties: OAuth2ProviderProperties,
    @org.springframework.beans.factory.annotation.Value("\${app.oauth2.success-url}") private val successUrl: String
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
    fun oauth2ProviderResolver(): OAuth2ProviderResolver =
        OAuth2ProviderResolver(oauth2ProviderProperties.defaultProvider, oauth2ProviderProperties.providers)

    @Bean
    fun oauth2ClaimsAdapters(): Map<String, OAuth2ClaimsAdapter> =
        listOf(AzureAdClaimsAdapter(), KeycloakClaimsAdapter()).associateBy { it.providerId }

    @Bean
    fun oauth2AuthorityMapper(): OAuth2AuthorityMapper = OAuth2AuthorityMapper()

    @Bean
    fun providerAwareOidcUserService(
        oauth2ProviderResolver: OAuth2ProviderResolver,
        oauth2ClaimsAdapters: Map<String, OAuth2ClaimsAdapter>,
        oauth2AuthorityMapper: OAuth2AuthorityMapper
    ): OAuth2UserService<OidcUserRequest, OidcUser> =
        ProviderAwareOidcUserService(oauth2ProviderResolver, oauth2ClaimsAdapters, oauth2AuthorityMapper)

    @Bean
    fun providerAwareJwtAuthenticationConverter(
        oauth2ProviderResolver: OAuth2ProviderResolver,
        oauth2ClaimsAdapters: Map<String, OAuth2ClaimsAdapter>,
        oauth2AuthorityMapper: OAuth2AuthorityMapper
    ) = ProviderAwareJwtAuthenticationConverter(oauth2ProviderResolver, oauth2ClaimsAdapters, oauth2AuthorityMapper)

    @Bean
    fun securityFilterChain(
        http: HttpSecurity,
        oauth2ProviderResolver: OAuth2ProviderResolver,
        providerAwareOidcUserService: OAuth2UserService<OidcUserRequest, OidcUser>,
        providerAwareJwtAuthenticationConverter: ProviderAwareJwtAuthenticationConverter
    ): SecurityFilterChain {
        http
            .csrf { csrf ->
                csrf.csrfTokenRepository(
                    org.springframework.security.web.csrf.CookieCsrfTokenRepository.withHttpOnlyFalse()
                )
                csrf.csrfTokenRequestHandler(
                    org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler()
                )
                csrf.ignoringRequestMatchers("/api/auth/login", "/api/auth/register", "/ws/**")
            }
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
                    .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/auth/providers").permitAll()
                    .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                    .requestMatchers("/ws/**").permitAll()
                    .anyRequest().authenticated()
            }
            .oauth2Login { oauth2 ->
                oauth2.userInfoEndpoint { userInfo ->
                    userInfo.oidcUserService(providerAwareOidcUserService)
                }
                oauth2.defaultSuccessUrl(successUrl, true)
            }
            .exceptionHandling { exceptions ->
                val loginEntryPoint = LoginUrlAuthenticationEntryPoint("/login")
                exceptions.defaultAuthenticationEntryPointFor(
                    loginEntryPoint,
                    RequestMatcher { request -> !request.requestURI.startsWith("/api/") }
                )
            }
            .oauth2ResourceServer { oauth2 ->
                oauth2.jwt { jwt ->
                    jwt.jwtAuthenticationConverter(providerAwareJwtAuthenticationConverter)
                }
            }
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }
}