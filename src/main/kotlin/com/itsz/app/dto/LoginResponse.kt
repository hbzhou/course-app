package com.itsz.app.dto

data class LoginResponse(
    val token: String,  // JWT token
    val user: UserInfo
)

data class UserInfo(
    val name: String,
    val email: String
)

