package com.itsz.app.service

import com.itsz.app.domain.Course
import com.itsz.app.event.DomainEventPublisher
import com.itsz.app.event.EntityType
import com.itsz.app.event.OperationEvent
import com.itsz.app.event.OperationType
import com.itsz.app.repository.CourseRepository
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class CourseService(
    private val courseRepository: CourseRepository,
    private val eventPublisher: DomainEventPublisher
) {

    fun getAllCourses(): List<Course> = courseRepository.findAll()

    fun getCourseById(id: String): Optional<Course> = courseRepository.findById(id)

    @Transactional
    fun createCourse(course: Course): Course {
        val saved = courseRepository.save(course)
        eventPublisher.publish(
            OperationEvent(
                entityType = EntityType.COURSE,
                operation = OperationType.CREATED,
                entityId = saved.id,
                entityName = saved.title,
                initiatedBy = currentUser()
            )
        )
        return saved
    }

    @Transactional
    fun updateCourse(id: String, course: Course): Course {
        return if (courseRepository.existsById(id)) {
            val saved = courseRepository.save(course.copy(id = id))
            eventPublisher.publish(
                OperationEvent(
                    entityType = EntityType.COURSE,
                    operation = OperationType.UPDATED,
                    entityId = saved.id,
                    entityName = saved.title,
                    initiatedBy = currentUser()
                )
            )
            saved
        } else {
            throw RuntimeException("Course not found with id: $id")
        }
    }

    @Transactional
    fun deleteCourse(id: String) {
        if (courseRepository.existsById(id)) {
            val course = courseRepository.findById(id).get()
            courseRepository.deleteById(id)
            eventPublisher.publish(
                OperationEvent(
                    entityType = EntityType.COURSE,
                    operation = OperationType.DELETED,
                    entityId = id,
                    entityName = course.title,
                    initiatedBy = currentUser()
                )
            )
        } else {
            throw RuntimeException("Course not found with id: $id")
        }
    }

    private fun currentUser(): String? =
        SecurityContextHolder.getContext().authentication?.name
}
