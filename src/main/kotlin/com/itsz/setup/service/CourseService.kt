package com.itsz.setup.service

import com.itsz.setup.domain.Course
import com.itsz.setup.repository.CourseRepository
import org.springframework.stereotype.Service
import java.util.*

@Service
class CourseService(private val courseRepository: CourseRepository) {

    fun getAllCourses(): List<Course> = courseRepository.findAll()

    fun getCourseById(id: String): Optional<Course> = courseRepository.findById(id)

    fun createCourse(course: Course): Course = courseRepository.save(course)

    fun updateCourse(id: String, course: Course): Course {
        return if (courseRepository.existsById(id)) {
            courseRepository.save(course.copy(id = id))
        } else {
            throw RuntimeException("Course not found with id: $id")
        }
    }

    fun deleteCourse(id: String) {
        if (courseRepository.existsById(id)) {
            courseRepository.deleteById(id)
        } else {
            throw RuntimeException("Course not found with id: $id")
        }
    }
}

