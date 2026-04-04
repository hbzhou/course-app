package com.itsz.app.domain

import jakarta.persistence.*

@Entity
data class Course(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    override val id: Long?,
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
    val authors: MutableList<Author> = mutableListOf(),
    @ManyToMany
    @JoinTable(
        name = "course_tags",
        joinColumns = [JoinColumn(name = "course_id")],
        inverseJoinColumns = [JoinColumn(name = "tag_id")]
    )
    val tags: MutableList<Tag> = mutableListOf()
) : BaseEntity
