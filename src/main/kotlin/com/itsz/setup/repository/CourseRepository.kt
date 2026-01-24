package com.itsz.setup.repository

import com.itsz.setup.domain.Course
import org.springframework.data.jpa.repository.JpaRepository

interface CourseRepository : JpaRepository<Course, String>

