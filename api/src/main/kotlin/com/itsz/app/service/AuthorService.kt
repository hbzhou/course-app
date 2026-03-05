package com.itsz.app.service

import com.itsz.app.domain.Author
import com.itsz.app.repository.AuthorRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class AuthorService(override val repository: AuthorRepository, override val nameExtractor: (Author) -> String? = {it.name}) : EntityCrudService<Author>() {

    override fun assignId(entity: Author, id: Long): Author = entity.copy(id = id)
}
