package com.itsz.app.service

import com.itsz.app.domain.Course
import com.itsz.app.event.DomainEventPublisher
import com.itsz.app.event.EntityType
import com.itsz.app.repository.CourseRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class CourseService(
    courseRepository: CourseRepository,
    eventPublisher: DomainEventPublisher
) : EntityCrudService<Course, Long>(
    courseRepository,
    eventPublisher,
    EntityType.COURSE,
    "Course",
    idExtractor = { it.id?.toString() },
    nameExtractor = { it.title }
) {

    fun getAllCourses(): List<Course> = getAll()

    fun getCourseById(id: Long): Optional<Course> = getById(id)

    @Transactional
    fun createCourse(course: Course): Course = create(course)

    @Transactional
    fun updateCourse(id: Long, course: Course): Course = update(id, course)

    @Transactional
    fun deleteCourse(id: Long) = delete(id)

    override fun assignId(entity: Course, id: Long): Course = entity.copy(id = id)
}
