package com.itsz.app.config

import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.web.FilterChainProxy
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.context.WebApplicationContext

@SpringBootTest
class SecurityConfigSessionAuthTest {

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
    fun `oauth2 protected request redirects unauthenticated users to authorization endpoint`() {
        mockMvc.get("/courses")
            .andExpect {
                status { is3xxRedirection() }
                redirectedUrlPattern("**/oauth2/authorization/keycloak")
            }
    }

    @Test
    fun `oauth2 login session can access protected api`() {
        mockMvc.get("/api/auth/me") {
            with(oauth2Login().attributes {
                it["preferred_username"] = "testuser"
                it["email"] = "test@example.com"
            })
        }.andExpect {
            status { isOk() }
            jsonPath("$.name") { value("testuser") }
            jsonPath("$.email") { value("test@example.com") }
        }
    }

    @Test
    fun `legacy bearer token access still works`() {
        mockMvc.get("/api/auth/me") {
            with(jwt().jwt { token ->
                token.subject("admin")
            })
        }.andExpect {
            status { isOk() }
        }
    }
}