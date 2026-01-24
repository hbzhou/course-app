package com.itsz.app.repository

import com.itsz.app.domain.Course
import org.springframework.data.jpa.repository.JpaRepository

interface CourseRepository : JpaRepository<Course, String>

