package com.itsz.app.config

import com.github.fppt.jedismock.RedisServer
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import java.net.ServerSocket

abstract class EmbeddedRedisSupport {

    companion object {
        private val redisPort: Int = ServerSocket(0).use { it.localPort }
        private val redisServer: RedisServer = RedisServer.newRedisServer(redisPort)

        init {
            redisServer.start()
            Runtime.getRuntime().addShutdownHook(Thread {
                runCatching { redisServer.stop() }
            })
        }

        @JvmStatic
        @DynamicPropertySource
        fun registerRedisProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.data.redis.host") { "127.0.0.1" }
            registry.add("spring.data.redis.port") { redisPort }
        }
    }
}
