package com.itsz.app.auth.oauth2

interface OAuth2ClaimsAdapter {
    val providerId: String
    fun normalize(claims: Map<String, Any?>, profile: OAuth2ProviderProfile): NormalizedOAuth2Principal
}
