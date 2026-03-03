package com.itsz.app.event

import com.itsz.app.domain.BaseEntity

class EventProviders {
    companion object {
        val createEventProvider = EventProvider<BaseEntity> { entity, entityName, initiatedBy ->
            OperationEvent.constructCreateEvent(entity, entityName, initiatedBy)
        }

        val updateEventProvider = EventProvider<BaseEntity> { entity, entityName, initiatedBy ->
            OperationEvent.constructUpdateEvent(entity, entityName, initiatedBy)
        }

        val deleteEventProvider = EventProvider<BaseEntity> { entity, entityName, initiatedBy ->
            OperationEvent.constructDeleteEvent(entity, entityName, initiatedBy)
        }
    }
}