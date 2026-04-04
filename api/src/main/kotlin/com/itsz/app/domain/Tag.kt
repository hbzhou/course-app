package com.itsz.app.domain

import jakarta.persistence.*

@Entity
data class Tag(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    override val id: Long?,
    val name: String,
    val color: String
) : BaseEntity
