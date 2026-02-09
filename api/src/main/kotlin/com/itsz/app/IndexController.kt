package com.itsz.app

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

@Controller
class IndexController {

    @GetMapping(
        "/**/*.html", "/**/*.css", "/**/*.js",
        "/**/*.png", "/**/*.jpg", "/**/*.jpeg", "/**/*.gif", "/**/*.svg", "/**/*.ico",
        "/**/*.woff", "/**/*.woff2", "/**/*.ttf",
        "/swagger-ui/**", "/v3/api-docs/**",
        "/ws/**",
        "/{path:[^\\.]*}"
    )
    fun forwardToRoot(): String {
        return "forward:/"
    }


}