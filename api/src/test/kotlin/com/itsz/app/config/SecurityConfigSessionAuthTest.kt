package com.itsz.app.config

import com.itsz.app.auth.oauth2.NormalizedOAuth2Principal
import com.itsz.app.auth.oauth2.OAuth2AuthorityMapper
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.assertj.core.api.Assertions.assertThat
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
class SecurityConfigSessionAuthTest : EmbeddedRedisSupport() {

    @Autowired
    lateinit var webApplicationContext: WebApplicationContext

    @Autowired
    lateinit var springSecurityFilterChain: FilterChainProxy

    @Autowired
    lateinit var oauth2AuthorityMapper: OAuth2AuthorityMapper

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
                redirectedUrlPattern("**/oauth2/authorization/azure")
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

    @Test
    fun `oauth2 authority mapper grants application permissions for admin role`() {
        val authorities = oauth2AuthorityMapper.map(
            NormalizedOAuth2Principal(
                provider = "keycloak",
                subject = "admin-id",
                username = "admin",
                email = "admin@course-app.local",
                groupsOrRoles = listOf("ROLE_ADMIN"),
                rawClaims = emptyMap()
            )
        )

        assertThat(authorities.map { it.authority })
            .contains("ROLE_ADMIN", "COURSE_VIEW", "COURSE_EDIT", "TAG_VIEW", "TAG_EDIT", "USER_MANAGE", "ROLE_MANAGE")
    }

    @Test
    fun `oauth2 session with mapped admin authorities can access course endpoints`() {
        val authorities = oauth2AuthorityMapper.map(
            NormalizedOAuth2Principal(
                provider = "keycloak",
                subject = "admin-id",
                username = "admin",
                email = "admin@course-app.local",
                groupsOrRoles = listOf("ROLE_ADMIN"),
                rawClaims = emptyMap()
            )
        )

        mockMvc.get("/api/courses") {
            with(
                oauth2Login()
                    .authorities(authorities)
                    .attributes {
                        it["preferred_username"] = "admin"
                        it["email"] = "admin@course-app.local"
                        it["realm_access"] = mapOf("roles" to listOf("ROLE_ADMIN"))
                    }
            )
        }.andExpect {
            status { isOk() }
        }
    }
}