package com.itsz.app.event

import com.itsz.app.domain.BaseEntity

enum class EntityType { COURSE, AUTHOR, USER, TAG }
enum class OperationType { CREATED, UPDATED, DELETED }

data class OperationEvent(
    val entityType: EntityType,
    val operation: OperationType,
    val entityId: String?,
    val entityName: String?,
    val initiatedBy: String? = null,
    val timestamp: Long = System.currentTimeMillis()
) {
    companion object {
        fun constructCreateEvent(entity: BaseEntity, entityName: String?, initiatedBy: String?) = construct(OperationType.CREATED, entity, entityName, initiatedBy)
        fun constructUpdateEvent(entity: BaseEntity, entityName: String?, initiatedBy: String?) = construct(OperationType.UPDATED, entity, entityName, initiatedBy)
        fun constructDeleteEvent(entity: BaseEntity, entityName: String?, initiatedBy: String?) = construct(OperationType.DELETED, entity, entityName, initiatedBy)

        private fun construct(op: OperationType, entity: BaseEntity, entityName: String?, initiatedBy: String?): OperationEvent{
            return OperationEvent(
                entityType = EntityType.valueOf(entity.javaClass.simpleName.uppercase()),
                operation = op,
                entityId = entity.id?.toString(),
                entityName = entityName,
                initiatedBy = initiatedBy
            )
        }
    }
}

