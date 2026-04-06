package com.itsz.app.service

import com.itsz.app.domain.Course
import com.itsz.app.repository.CourseRepository
import org.springframework.stereotype.Service

@Service
class CourseService(override val repository: CourseRepository, override val nameExtractor: (Course) -> String?= {it.title}) : EntityCrudService<Course>() {

    override fun assignId(entity: Course, id: Long): Course = entity.copy(id = id)

    override fun entityName(): String = "Course"
}
