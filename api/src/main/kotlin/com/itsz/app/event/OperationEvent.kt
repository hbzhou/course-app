package com.itsz.app.event

enum class EntityType { COURSE, AUTHOR, USER }
enum class OperationType { CREATED, UPDATED, DELETED }

data class OperationEvent(
    val entityType: EntityType,
    val operation: OperationType,
    val entityId: String?,
    val entityName: String?,
    val initiatedBy: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

