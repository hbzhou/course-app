package com.itsz.app

import com.itsz.app.config.TestSecurityConfigDisabler
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import

@SpringBootTest(properties = [
    "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://localhost:8080/realms/course-app/protocol/openid-connect/certs",
    "spring.security.oauth2.resourceserver.jwt.issuer-uri=http://localhost:8080/realms/course-app",
    "app.oauth2.success-url=http://localhost:3000",
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "jwt.secret=test-jwt-secret-with-at-least-32-characters-length",
    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration"
])
@Import(TestSecurityConfigDisabler::class)
class CourseAppTests {

    @Test
    fun contextLoads() {
    }

}
