package com.itsz.app.domain

import jakarta.persistence.*

@Entity
@Table(name = "author")
data class Author(
    @Id
    val id: String,
    val name: String
)
