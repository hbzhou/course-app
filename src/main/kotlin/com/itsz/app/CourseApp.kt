package com.itsz.app

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class CourseApp

fun main(args: Array<String>) {
    runApplication<CourseApp>(*args)
}