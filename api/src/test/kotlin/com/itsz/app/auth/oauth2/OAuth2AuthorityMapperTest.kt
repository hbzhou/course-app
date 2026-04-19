package com.itsz.app.auth.oauth2

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.security.core.authority.SimpleGrantedAuthority

class OAuth2AuthorityMapperTest {

    @Test
    fun `maps normalized roles to permissions and keeps base authorities`() {
        val principal = NormalizedOAuth2Principal(
            provider = "azure",
            subject = "subject-1",
            username = "azure.user@contoso.com",
            email = "azure.user@contoso.com",
            groupsOrRoles = listOf("ROLE_ADMIN", "ROLE_USER"),
            rawClaims = emptyMap()
        )

        val mapped = OAuth2AuthorityMapper().map(
            normalized = principal,
            baseAuthorities = listOf(SimpleGrantedAuthority("OIDC_USER"))
        )

        assertThat(mapped.map { it.authority }).contains(
            "OIDC_USER",
            "ROLE_ADMIN",
            "ROLE_USER",
            "COURSE_VIEW",
            "COURSE_EDIT",
            "TAG_VIEW",
            "TAG_EDIT",
            "USER_MANAGE",
            "ROLE_MANAGE"
        )
    }
}
