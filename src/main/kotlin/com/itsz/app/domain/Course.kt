package com.itsz.app.domain

import jakarta.persistence.*
import java.util.Date

@Entity
data class Course(
    @Id
    val id: String,
    val title: String,
    val description: String,
    val creationDate: String,
    val duration: Int,
    @ManyToMany
    @JoinTable(
        name = "course_authors",
        joinColumns = [JoinColumn(name = "course_id")],
        inverseJoinColumns = [JoinColumn(name = "user_id")]
    )
    val authors: List<User>
)

