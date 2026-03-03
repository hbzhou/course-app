package com.itsz.app.event

import com.itsz.app.domain.BaseEntity

fun interface EventProvider<in T: BaseEntity> {
    fun toEvent(entity: T, entityName: String?, initiatedBy: String?): OperationEvent
}