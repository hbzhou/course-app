package com.itsz.app.config

import com.itsz.app.exception.AppException
import com.itsz.app.exception.EntityNotFoundException
import com.itsz.app.exception.ValidationException
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.access.AccessDeniedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.time.Instant

@RestControllerAdvice
class GlobalExceptionHandler {

    private val logger = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    @ExceptionHandler(EntityNotFoundException::class)
    fun handleEntityNotFound(ex: EntityNotFoundException): ResponseEntity<ErrorResponse> {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(error(HttpStatus.NOT_FOUND, ex.message, ex.code))
    }

    @ExceptionHandler(ValidationException::class, MethodArgumentNotValidException::class, IllegalArgumentException::class)
    fun handleValidation(ex: Exception): ResponseEntity<ErrorResponse> {
        val message = when (ex) {
            is ValidationException -> ex.message
            is MethodArgumentNotValidException -> ex.bindingResult.allErrors.firstOrNull()?.defaultMessage ?: "Validation failed"
            else -> ex.message ?: "Validation failed"
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(error(HttpStatus.BAD_REQUEST, message, "VALIDATION_ERROR"))
    }

    @ExceptionHandler(BadCredentialsException::class)
    fun handleBadCredentials(ex: BadCredentialsException): ResponseEntity<ErrorResponse> {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(error(HttpStatus.UNAUTHORIZED, ex.message ?: "Authentication failed", "AUTHENTICATION_FAILED"))
    }

    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDenied(ex: AccessDeniedException): ResponseEntity<ErrorResponse> {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(error(HttpStatus.FORBIDDEN, ex.message ?: "Access denied", "ACCESS_DENIED"))
    }

    @ExceptionHandler(AppException::class)
    fun handleAppException(ex: AppException): ResponseEntity<ErrorResponse> {
        val status = if (ex.code == "ENTITY_NOT_FOUND") HttpStatus.NOT_FOUND else HttpStatus.BAD_REQUEST
        return ResponseEntity.status(status)
            .body(error(status, ex.message, ex.code))
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception): ResponseEntity<ErrorResponse> {
        logger.error("Unhandled exception", ex)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", "INTERNAL_SERVER_ERROR"))
    }

    private fun error(status: HttpStatus, message: String, code: String): ErrorResponse {
        return ErrorResponse(
            status = status.value(),
            code = code,
            message = message,
            timestamp = Instant.now().toString()
        )
    }
}

data class ErrorResponse(
    val status: Int,
    val code: String,
    val message: String,
    val timestamp: String
)
