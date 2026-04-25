package com.itsz.app.auth.controller

import com.itsz.app.config.EmbeddedRedisSupport
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.web.FilterChainProxy
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.context.WebApplicationContext

@SpringBootTest
class AuthControllerProvidersTest : EmbeddedRedisSupport() {

    @Autowired
    lateinit var webApplicationContext: WebApplicationContext

    @Autowired
    lateinit var springSecurityFilterChain: FilterChainProxy

    private lateinit var mockMvc: MockMvc

    @BeforeEach
    fun setUp() {
        val builder: DefaultMockMvcBuilder = MockMvcBuilders.webAppContextSetup(webApplicationContext)
        builder.addFilters<DefaultMockMvcBuilder>(springSecurityFilterChain)
        mockMvc = builder.build()
    }

    @Test
    fun `providers endpoint returns configured providers`() {
        mockMvc.get("/api/auth/providers")
            .andExpect {
                status { isOk() }
                jsonPath("$[0].providerId") { value("azure") }
                jsonPath("$[0].displayName") { value("Azure AD") }
                jsonPath("$[1].providerId") { value("keycloak") }
                jsonPath("$[1].displayName") { value("Keycloak") }
                jsonPath("$[2].providerId") { value("google") }
                jsonPath("$[2].displayName") { value("Google") }
            }
    }

    @Test
    fun `providers endpoint is publicly accessible without authentication`() {
        mockMvc.get("/api/auth/providers")
            .andExpect {
                status { isOk() }
            }
    }

    @Test
    fun `providers endpoint does not expose internal claim configuration`() {
        mockMvc.get("/api/auth/providers")
            .andExpect {
                status { isOk() }
                jsonPath("$[0].usernameClaims") { doesNotExist() }
                jsonPath("$[0].emailClaims") { doesNotExist() }
                jsonPath("$[0].roleClaims") { doesNotExist() }
                jsonPath("$[0].issuerUri") { doesNotExist() }
            }
    }
}
