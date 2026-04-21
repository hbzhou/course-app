package com.itsz.app.auth.oauth2

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.oauth2")
data class OAuth2ProviderProperties(
    val defaultProvider: String = "azure",
    val providers: List<OAuth2ProviderProfile> = emptyList()
)
