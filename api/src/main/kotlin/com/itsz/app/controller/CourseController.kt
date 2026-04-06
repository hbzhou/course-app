package com.itsz.app.controller

import com.itsz.app.domain.Course
import com.itsz.app.service.CourseService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/courses")
class CourseController(private val courseService: CourseService) {

    @GetMapping
    @PreAuthorize("hasAuthority('COURSE_VIEW')")
    fun getAllCourses(): List<Course> = courseService.getAll()

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_VIEW')")
    fun getCourseById(@PathVariable id: Long): ResponseEntity<Course> {
        return courseService.getById(id)
            .map { ResponseEntity.ok(it) }
            .orElse(ResponseEntity.notFound().build())
    }

    @PostMapping
    @PreAuthorize("hasAuthority('COURSE_EDIT')")
    fun createCourse(@RequestBody course: Course): ResponseEntity<Course> {
        val createdCourse = courseService.create(course)
        return ResponseEntity.status(HttpStatus.CREATED).body(createdCourse)
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_EDIT')")
    fun updateCourse(@PathVariable id: Long, @RequestBody course: Course): ResponseEntity<Course> =
        ResponseEntity.ok(courseService.update(id, course))

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_EDIT')")
    fun deleteCourse(@PathVariable id: Long): ResponseEntity<Void> {
        courseService.delete(id)
        return ResponseEntity.noContent().build()
    }
}
