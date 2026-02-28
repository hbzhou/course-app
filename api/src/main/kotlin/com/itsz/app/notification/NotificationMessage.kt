package com.itsz.app.notification

data class NotificationMessage(
    val entityType: String,
    val operation: String,
    val entityId: String?,
    val entityName: String?,
    val initiatedBy: String?,
    val timestamp: Long
)

