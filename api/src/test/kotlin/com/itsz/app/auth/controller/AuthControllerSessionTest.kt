package com.itsz.app.auth.controller

import com.itsz.app.config.EmbeddedRedisSupport
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.context.WebApplicationContext
import org.springframework.security.web.FilterChainProxy
import org.junit.jupiter.api.BeforeEach

@SpringBootTest
class AuthControllerSessionTest : EmbeddedRedisSupport() {

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
    fun `me returns normalized session principal details`() {
        mockMvc.get("/api/auth/me") {
            with(
                oauth2Login().attributes {
                    it["preferred_username"] = "testuser"
                    it["email"] = "testuser@example.com"
                    it["provider"] = "azure"
                }
            )
        }.andExpect {
            status { isOk() }
            jsonPath("$.name") { value("testuser") }
            jsonPath("$.email") { value("testuser@example.com") }
            jsonPath("$.provider") { value("azure") }
            jsonPath("$.authType") { value("session") }
        }
    }

    @Test
    fun `logout invalidates current session`() {
        mockMvc.delete("/api/auth/logout") {
            with(oauth2Login())
        }.andExpect {
            status { isOk() }
            header { string("Clear-Site-Data", "\"cookies\"") }
        }
    }
}
