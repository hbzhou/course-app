package com.itsz.app.config

import org.springframework.context.annotation.Configuration
import org.springframework.core.io.ClassPathResource
import org.springframework.core.io.Resource
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import org.springframework.web.servlet.resource.PathResourceResolver

@Configuration
class WebConfig : WebMvcConfigurer {

    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        registry.addResourceHandler("/**")
            .addResourceLocations("classpath:/public/")
            .setCachePeriod(0)
            .resourceChain(true)
            .addResolver(object : PathResourceResolver() {
                override fun getResource(resourcePath: String, location: Resource): Resource? {
                    val requestedResource = location.createRelative(resourcePath)

                    // If the resource exists and is readable, return it
                    if (requestedResource.exists() && requestedResource.isReadable) {
                        return requestedResource
                    }

                    // For SPA routing: if the path doesn't start with api, assets, swagger-ui, etc.
                    // and the resource doesn't exist, return index.html
                    if (!resourcePath.startsWith("api/") &&
                        !resourcePath.startsWith("assets/") &&
                        !resourcePath.startsWith("swagger-ui/") &&
                        !resourcePath.startsWith("v3/api-docs/") &&
                        !resourcePath.contains(".")) {
                        return ClassPathResource("public/index.html")
                    }

                    return null
                }
            })
    }
}
