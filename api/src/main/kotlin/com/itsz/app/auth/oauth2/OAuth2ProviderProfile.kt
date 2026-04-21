package com.itsz.app.auth.oauth2

data class OAuth2ProviderProfile(
    val providerId: String,
    val displayName: String,
    val issuerUri: String,
    val usernameClaims: List<String> = emptyList(),
    val emailClaims: List<String> = emptyList(),
    val roleClaims: List<String> = emptyList()
)
