package com.itsz.app.exception

open class AppException(
    override val message: String,
    val code: String
) : RuntimeException(message)

class EntityNotFoundException(entityName: String, id: Long) : AppException(
    message = "$entityName not found with id: $id",
    code = "ENTITY_NOT_FOUND"
)

class ResourceNotFoundException(message: String) : AppException(
    message = message,
    code = "ENTITY_NOT_FOUND"
)

class ValidationException(message: String) : AppException(
    message = message,
    code = "VALIDATION_ERROR"
)
