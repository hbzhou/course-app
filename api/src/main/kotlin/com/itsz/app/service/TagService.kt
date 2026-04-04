package com.itsz.app.service

import com.itsz.app.domain.Tag
import com.itsz.app.repository.TagRepository
import org.springframework.stereotype.Service

@Service
class TagService(
    override val repository: TagRepository,
    override val nameExtractor: (Tag) -> String? = { it.name }
) : EntityCrudService<Tag>() {

    override fun assignId(entity: Tag, id: Long): Tag = entity.copy(id = id)
}
