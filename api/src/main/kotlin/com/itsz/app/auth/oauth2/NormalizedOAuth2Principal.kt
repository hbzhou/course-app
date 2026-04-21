package com.itsz.app.auth.oauth2

data class NormalizedOAuth2Principal(
    val provider: String,
    val subject: String,
    val username: String,
    val email: String,
    val groupsOrRoles: List<String>,
    val rawClaims: Map<String, Any?>
) {
    fun toAttributes(): Map<String, Any?> = rawClaims + mapOf(
        "provider" to provider,
        "subject" to subject,
        "username" to username,
        "email" to email,
        "groupsOrRoles" to groupsOrRoles
    )
}
