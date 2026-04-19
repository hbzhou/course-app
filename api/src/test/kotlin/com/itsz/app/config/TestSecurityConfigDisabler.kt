package com.itsz.app.config

import com.itsz.app.auth.oauth2.OAuth2AuthorityMapper
import com.itsz.app.auth.oauth2.OAuth2ProviderProfile
import com.itsz.app.auth.oauth2.OAuth2ProviderProperties
import com.itsz.app.auth.oauth2.OAuth2ProviderResolver
import com.itsz.app.auth.oauth2.ProviderAwareJwtAuthenticationConverter
import org.mockito.Mockito
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.web.SecurityFilterChain

/**
 * Test configuration that provides mock implementations of security beans.
 * This allows CourseAppTests to load the full application context without
 * requiring Keycloak, JWT validation, or OAuth2 configuration.
 *
 * The @Primary annotation ensures these mocks override the production SecurityConfig beans
 * only in the test context.
 */
@TestConfiguration
class TestSecurityConfigDisabler {

    /**
     * Provides a mock SecurityFilterChain for test context.
     * The real SecurityFilterChain requires full OAuth2/Keycloak setup;
     * the mock allows context bootstrap without external dependencies.
     */
    @Bean
    @Primary
    fun mockSecurityFilterChain(): SecurityFilterChain {
        return Mockito.mock(SecurityFilterChain::class.java)
    }

    /**
     * Provides a mock OAuth2UserService for test context.
     * Prevents keycloakOidcUserService bean initialization which depends on
     * JwtDecoder and Keycloak configuration.
     */
    @Bean
    @Primary
    fun mockOidcUserService(): OAuth2UserService<OidcUserRequest, OidcUser> {
        @Suppress("UNCHECKED_CAST")
        return Mockito.mock(OAuth2UserService::class.java) as OAuth2UserService<OidcUserRequest, OidcUser>
    }

    /**
     * Provides a mock JwtDecoder for test context.
     * The real JwtDecoder requires Keycloak/OIDC provider configuration.
     */
    @Bean
    @Primary
    fun mockJwtDecoder(): JwtDecoder {
        return Mockito.mock(JwtDecoder::class.java)
    }

    /**
     * Provides a mock UserDetailsService for test context.
     * Required by SecurityConfig constructor.
     */
    @Bean
    @Primary
    fun mockUserDetailsService(): UserDetailsService {
        return Mockito.mock(UserDetailsService::class.java)
    }

    /**
     * Provides a mock PasswordEncoder for test context.
     * Required by SecurityConfig::authenticationManager.
     */
    @Bean
    @Primary
    fun mockPasswordEncoder(): PasswordEncoder {
        return Mockito.mock(PasswordEncoder::class.java)
    }

    /**
     * Provides a mock AuthenticationManager for test context.
     * Required by some security beans.
     */
    @Bean
    @Primary
    fun mockAuthenticationManager(): AuthenticationManager {
        return Mockito.mock(AuthenticationManager::class.java)
    }

    @Bean
    @Primary
    fun mockOAuth2ProviderProperties(): OAuth2ProviderProperties {
        return OAuth2ProviderProperties(
            defaultProvider = "azure",
            providers = listOf(
                OAuth2ProviderProfile("azure", "Azure AD", "https://login.microsoftonline.com/common/v2.0")
            )
        )
    }

    @Bean
    @Primary
    fun mockOAuth2ProviderResolver(): OAuth2ProviderResolver {
        return Mockito.mock(OAuth2ProviderResolver::class.java)
    }

    @Bean
    @Primary
    fun mockOAuth2AuthorityMapper(): OAuth2AuthorityMapper {
        return Mockito.mock(OAuth2AuthorityMapper::class.java)
    }

    @Bean
    @Primary
    fun mockProviderAwareJwtAuthenticationConverter(): ProviderAwareJwtAuthenticationConverter {
        return Mockito.mock(ProviderAwareJwtAuthenticationConverter::class.java)
    }

    /**
     * Provides a mock ClientRegistrationRepository for test context.
     * Required by oauth2Login configuration in SecurityFilterChain.
     */
    @Bean
    @Primary
    fun mockClientRegistrationRepository(): ClientRegistrationRepository {
        return Mockito.mock(ClientRegistrationRepository::class.java)
    }

}
