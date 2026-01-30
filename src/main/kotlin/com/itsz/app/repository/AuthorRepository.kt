package com.itsz.app.repository

import com.itsz.app.domain.Author
import org.springframework.data.jpa.repository.JpaRepository

interface AuthorRepository : JpaRepository<Author, String>
