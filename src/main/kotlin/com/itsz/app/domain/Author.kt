package com.itsz.app.domain

import jakarta.persistence.*

@Entity
@Table(name = "author")
data class Author(
    @Id @GeneratedValue(strategy = GenerationType.AUTO)
    val id: String?,
    val name: String
)
