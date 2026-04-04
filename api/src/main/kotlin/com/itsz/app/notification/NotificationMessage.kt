package com.itsz.app.notification

data class NotificationMessage(
    val entityType: String,
    val operation: String,
    val timestamp: Long
)

