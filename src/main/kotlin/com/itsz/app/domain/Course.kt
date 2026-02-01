package com.itsz.app.domain

import jakarta.persistence.*

@Entity
data class Course(
    @Id @GeneratedValue(strategy = GenerationType.AUTO)
    val id: String?,
    val title: String,
    val description: String,
    val creationDate: String,
    val duration: Int,
    @ManyToMany
    @JoinTable(
        name = "course_authors",
        joinColumns = [JoinColumn(name = "course_id")],
        inverseJoinColumns = [JoinColumn(name = "author_id")]
    )
    val authors: MutableList<Author> = mutableListOf()
)

