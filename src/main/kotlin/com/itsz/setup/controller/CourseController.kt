package com.itsz.setup.controller

import com.itsz.setup.domain.Course
import com.itsz.setup.service.CourseService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/courses")
class CourseController(private val courseService: CourseService) {

    @GetMapping
    fun getAllCourses(): List<Course> = courseService.getAllCourses()

    @GetMapping("/{id}")
    fun getCourseById(@PathVariable id: String): ResponseEntity<Course> {
        return courseService.getCourseById(id)
            .map { ResponseEntity.ok(it) }
            .orElse(ResponseEntity.notFound().build())
    }

    @PostMapping
    fun createCourse(@RequestBody course: Course): ResponseEntity<Course> {
        val createdCourse = courseService.createCourse(course)
        return ResponseEntity.status(HttpStatus.CREATED).body(createdCourse)
    }

    @PutMapping("/{id}")
    fun updateCourse(@PathVariable id: String, @RequestBody course: Course): ResponseEntity<Course> {
        return try {
            val updatedCourse = courseService.updateCourse(id, course)
            ResponseEntity.ok(updatedCourse)
        } catch (e: RuntimeException) {
            ResponseEntity.notFound().build()
        }
    }

    @DeleteMapping("/{id}")
    fun deleteCourse(@PathVariable id: String): ResponseEntity<Void> {
        return try {
            courseService.deleteCourse(id)
            ResponseEntity.noContent().build()
        } catch (e: RuntimeException) {
            ResponseEntity.notFound().build()
        }
    }
}

