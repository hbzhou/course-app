# AI Agent Implementation Prompts for Redis WebSocket Event System

## Context
These prompts are designed to guide an AI agent to implement a complete real-time event notification system using Redis pub/sub and WebSocket, based on the functionality observed in Merge Request #2 of the course-app project.

---

## Prompt 1: Create Domain Event Infrastructure

```
Create a domain event publishing system for a Kotlin Spring Boot application with the following requirements:

1. Create an OperationEvent data class with these fields:
   - entityType: String (e.g., "USER", "COURSE")
   - operation: String (e.g., "CREATED", "UPDATED", "DELETED")
   - entityId: String (nullable)
   - entityName: String (nullable) - human-readable entity identifier
   - initiatedBy: String (nullable) - username of the user who triggered the event
   - timestamp: Instant - automatically set to current time

2. Create EntityType enum with values: USER, COURSE, LESSON, ENROLLMENT

3. Create OperationType enum with values: CREATED, UPDATED, DELETED

4. Create a DomainEventPublisher interface with:
   - publish(event: OperationEvent) method

5. Implement RedisEventPublisher that:
   - Uses Spring's RedisTemplate
   - Publishes events to a Redis channel named "domain-events"
   - Serializes events to JSON
   - Logs successful publications
   - Has error handling for Redis failures

Files to create:
- src/main/kotlin/com/itsz/app/event/OperationEvent.kt
- src/main/kotlin/com/itsz/app/event/EntityType.kt
- src/main/kotlin/com/itsz/app/event/OperationType.kt
- src/main/kotlin/com/itsz/app/event/DomainEventPublisher.kt
- src/main/kotlin/com/itsz/app/event/RedisEventPublisher.kt
```

---

## Prompt 2: Configure Redis for Event Publishing

```
Configure Redis integration in a Spring Boot Kotlin application for event publishing:

1. Add required dependencies to build.gradle.kts:
   - spring-boot-starter-data-redis
   - spring-boot-starter-websocket
   - lettuce-core (Redis client)
   - jackson-databind for JSON serialization

2. Create RedisConfig.kt configuration class:
   - Define RedisTemplate<String, String> bean
   - Configure Jackson2JsonRedisSerializer for OperationEvent
   - Set up Redis connection factory
   - Configure Redis message listener container

3. Create application.yml configuration with:
   - Redis host, port, password (use environment variables)
   - Connection pool settings
   - Channel name configuration

4. Add Redis health check endpoint

Example configuration:
```yaml
spring:
  redis:
    host: ${REDIS_HOST:localhost}
    port: ${REDIS_PORT:6379}
    password: ${REDIS_PASSWORD:}
    channel: domain-events
```

Files to create:
- src/main/kotlin/com/itsz/app/config/RedisConfig.kt
- src/main/resources/application.yml (update)
- build.gradle.kts (update)
```

---

## Prompt 3: Integrate Event Publishing in UserService

```
Modify the UserService class in a Kotlin Spring Boot application to publish domain events for all CRUD operations:

Context:
- UserService already exists with: getAllUsers(), getUserByUsername(), createUser(), updateUser(), deleteUser()
- Add DomainEventPublisher as a constructor dependency
- Use @Transactional to ensure events are only published on successful database commits

Requirements:

1. Update the constructor to inject DomainEventPublisher:
```kotlin
class UserService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val eventPublisher: DomainEventPublisher
)
```

2. Modify createUser(user: User): User to:
   - Add @Transactional annotation
   - Save user to database
   - Publish OperationEvent with:
     - entityType = EntityType.USER
     - operation = OperationType.CREATED
     - entityId = saved.id?.toString()
     - entityName = saved.username
     - initiatedBy = currentUser()
   - Return saved user

3. Modify updateUser(id: Long, user: User): User to:
   - Add @Transactional annotation
   - Update user in database
   - Publish OperationEvent with operation = OperationType.UPDATED
   - Return updated user

4. Modify deleteUser(id: Long) to:
   - Add @Transactional annotation
   - Fetch user first (to get username for event)
   - Delete user from database
   - Publish OperationEvent with operation = OperationType.DELETED
   - Include username in event even though user is deleted

5. Add private helper method:
```kotlin
private fun currentUser(): String? =
    SecurityContextHolder.getContext().authentication?.name
```

6. Add required imports:
   - org.springframework.transaction.annotation.Transactional
   - org.springframework.security.core.context.SecurityContextHolder
   - All event-related classes

File to modify:
- src/main/kotlin/com/itsz/app/auth/service/UserService.kt
```

---

## Prompt 4: Create WebSocket Configuration

```
Create WebSocket configuration for a Spring Boot Kotlin application to broadcast real-time events to connected clients:

1. Create WebSocketConfig.kt:
   - Implement WebSocketMessageBrokerConfigurer
   - Configure STOMP endpoint at "/ws" with SockJS fallback
   - Configure message broker with prefix "/topic"
   - Allow cross-origin requests

2. Create WebSocketEventBroadcaster service:
   - Inject SimpMessagingTemplate
   - Implement Redis subscriber that listens to "domain-events" channel
   - Parse incoming OperationEvent JSON
   - Broadcast to WebSocket topic "/topic/events"
   - Add error handling and logging

3. Create WebSocketController:
   - @MessageMapping("/subscribe")
   - Handle client subscription requests
   - Send initial connection confirmation

4. Update RedisConfig to register the WebSocketEventBroadcaster as Redis message listener

Example WebSocket broadcast code:
```kotlin
@Component
class WebSocketEventBroadcaster(
    private val messagingTemplate: SimpMessagingTemplate,
    private val objectMapper: ObjectMapper
) : MessageListener {
    
    override fun onMessage(message: Message, pattern: ByteArray?) {
        val event = objectMapper.readValue(message.body, OperationEvent::class.java)
        messagingTemplate.convertAndSend("/topic/events", event)
    }
}
```

Files to create:
- src/main/kotlin/com/itsz/app/config/WebSocketConfig.kt
- src/main/kotlin/com/itsz/app/websocket/WebSocketEventBroadcaster.kt
- src/main/kotlin/com/itsz/app/websocket/WebSocketController.kt
```

---

## Prompt 5: Create Frontend WebSocket Client

```
Create a TypeScript React component that connects to the WebSocket server and displays real-time user operation events:

1. Install dependencies:
   - sockjs-client
   - @stomp/stompjs
   - @types/sockjs-client

2. Create useWebSocket custom hook:
   - Connect to ws://localhost:8080/ws
   - Subscribe to /topic/events
   - Return event stream as state
   - Handle reconnection on disconnect
   - Cleanup on unmount

3. Create EventNotifications component:
   - Use useWebSocket hook
   - Display toast notifications for events
   - Different colors for CREATE (green), UPDATE (blue), DELETE (red)
   - Show: "[USER] john.doe was CREATED by admin"

4. Create UserList component that:
   - Fetches initial user list via REST API
   - Subscribes to WebSocket events
   - Automatically adds new users to list on CREATE event
   - Updates existing users on UPDATE event
   - Removes users on DELETE event
   - No polling required - purely event-driven

Example useWebSocket hook:
```typescript
import SockJS from 'sockjs-client';
import { Client, Message } from '@stomp/stompjs';

interface OperationEvent {
  entityType: string;
  operation: string;
  entityId: string;
  entityName: string;
  initiatedBy: string;
  timestamp: string;
}

export const useWebSocket = (url: string) => {
  const [events, setEvents] = useState<OperationEvent[]>([]);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const socket = new SockJS(url);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        setConnected(true);
        client.subscribe('/topic/events', (message: Message) => {
          const event = JSON.parse(message.body);
          setEvents(prev => [...prev, event]);
        });
      },
      onDisconnect: () => setConnected(false),
    });
    
    client.activate();
    return () => client.deactivate();
  }, [url]);
  
  return { events, connected };
};
```

Files to create:
- ui/src/hooks/useWebSocket.ts
- ui/src/components/EventNotifications.tsx
- ui/src/components/UserList.tsx
```

---

## Prompt 6: Add Logout Endpoint to AuthController

```
Add a logout endpoint to the existing AuthController in a Kotlin Spring Boot application:

1. Add DELETE mapping at /api/auth/logout
2. Method should:
   - Accept no parameters (token invalidation handled by frontend)
   - Return ResponseEntity<Void> with HttpStatus.OK
   - Log the logout action

3. Add required imports:
   - org.springframework.http.HttpStatus
   - org.springframework.http.ResponseEntity

4. Replace individual Spring annotation imports with wildcard:
   - Change multiple @RestController, @PostMapping, @RequestBody, @RequestMapping imports
   - To: import org.springframework.web.bind.annotation.*

Example implementation:
```kotlin
@DeleteMapping("/logout")
fun logout(): ResponseEntity<Void> {
    logger.info("User logged out")
    return ResponseEntity(HttpStatus.OK)
}
```

File to modify:
- src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt
```

---

## Prompt 7: Add Comprehensive Unit Tests

```
Create comprehensive unit tests for the event publishing system in a Kotlin Spring Boot application:

1. Test UserService event publishing:
   - Mock UserRepository and DomainEventPublisher
   - Verify createUser publishes CREATED event with correct data
   - Verify updateUser publishes UPDATED event
   - Verify deleteUser publishes DELETED event
   - Verify events contain correct initiatedBy from SecurityContext
   - Verify no events published when transaction rolls back

2. Test RedisEventPublisher:
   - Mock RedisTemplate
   - Verify publish method sends to correct channel
   - Verify event serialization to JSON
   - Test error handling when Redis is unavailable

3. Test WebSocketEventBroadcaster:
   - Mock SimpMessagingTemplate
   - Verify Redis messages are broadcast to WebSocket
   - Verify correct topic path
   - Test JSON parsing errors

Example test:
```kotlin
@ExtendWith(MockitoExtension::class)
class UserServiceTest {
    
    @Mock
    private lateinit var userRepository: UserRepository
    
    @Mock
    private lateinit var passwordEncoder: PasswordEncoder
    
    @Mock
    private lateinit var eventPublisher: DomainEventPublisher
    
    private lateinit var userService: UserService
    
    @BeforeEach
    fun setup() {
        userService = UserService(userRepository, passwordEncoder, eventPublisher)
    }
    
    @Test
    fun `createUser should publish CREATED event`() {
        // given
        val user = User(username = "john", password = "pass123")
        val savedUser = user.copy(id = 1L)
        whenever(userRepository.save(any())).thenReturn(savedUser)
        whenever(passwordEncoder.encode(any())).thenReturn("encoded")
        
        // when
        userService.createUser(user)
        
        // then
        verify(eventPublisher).publish(
            argThat { event ->
                event.entityType == EntityType.USER &&
                event.operation == OperationType.CREATED &&
                event.entityId == "1" &&
                event.entityName == "john"
            }
        )
    }
}
```

Files to create:
- src/test/kotlin/com/itsz/app/auth/service/UserServiceTest.kt
- src/test/kotlin/com/itsz/app/event/RedisEventPublisherTest.kt
- src/test/kotlin/com/itsz/app/websocket/WebSocketEventBroadcasterTest.kt
```

---

## Prompt 8: Create Integration Tests

```
Create integration tests for the end-to-end event flow in a Spring Boot Kotlin application:

1. Create IntegrationTest base class:
   - Use @SpringBootTest with random port
   - Use @Testcontainers with Redis container
   - Configure embedded database

2. Create EventFlowIntegrationTest:
   - Start Redis container
   - Subscribe to Redis channel "domain-events"
   - Call REST API to create user
   - Verify event received in Redis within 5 seconds
   - Verify event has correct structure and data

3. Create WebSocketIntegrationTest:
   - Connect WebSocket client
   - Subscribe to /topic/events
   - Call REST API to create user
   - Verify WebSocket message received
   - Verify multiple clients receive same event

Example integration test:
```kotlin
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class EventFlowIntegrationTest {
    
    @Container
    val redis = GenericContainer<Nothing>("redis:7-alpine").apply {
        withExposedPorts(6379)
    }
    
    @LocalServerPort
    private var port: Int = 0
    
    @Autowired
    private lateinit var restTemplate: TestRestTemplate
    
    @Test
    fun `creating user should publish event to Redis`() {
        // given
        val redis = RedisClient.create("redis://localhost:${redis.firstMappedPort}")
        val connection = redis.connect()
        val pubsub = connection.sync()
        val events = mutableListOf<String>()
        
        pubsub.subscribe("domain-events")
        pubsub.addListener(object : RedisPubSubAdapter<String, String>() {
            override fun message(channel: String, message: String) {
                events.add(message)
            }
        })
        
        // when
        val user = mapOf("username" to "john", "password" to "pass123")
        restTemplate.postForEntity("/api/users", user, User::class.java)
        
        // then
        await().atMost(5, TimeUnit.SECONDS).until { events.isNotEmpty() }
        val event = ObjectMapper().readValue(events.first(), OperationEvent::class.java)
        assertThat(event.entityType).isEqualTo(EntityType.USER)
        assertThat(event.operation).isEqualTo(OperationType.CREATED)
        assertThat(event.entityName).isEqualTo("john")
    }
}
```

Files to create:
- src/test/kotlin/com/itsz/app/integration/EventFlowIntegrationTest.kt
- src/test/kotlin/com/itsz/app/integration/WebSocketIntegrationTest.kt
- src/test/kotlin/com/itsz/app/integration/IntegrationTestBase.kt
```

---

## Prompt 9: Add Monitoring and Observability

```
Add monitoring and observability for the Redis event publishing and WebSocket system in a Spring Boot Kotlin application:

1. Add Micrometer metrics:
   - Counter for events published by type
   - Counter for events published by operation
   - Gauge for active WebSocket connections
   - Timer for event publishing duration
   - Counter for Redis connection failures

2. Create EventMetrics service:
   - Inject MeterRegistry
   - Wrap DomainEventPublisher to record metrics
   - Record event counts, types, and duration

3. Add structured logging:
   - Log each event publication with correlation ID
   - Log WebSocket connection/disconnection
   - Log Redis connection issues
   - Use MDC for request tracing

4. Create health indicators:
   - RedisHealthIndicator - check Redis connectivity
   - WebSocketHealthIndicator - check active connections
   - EventPublishingHealthIndicator - check recent publishing success rate

5. Expose metrics endpoint:
   - Add actuator dependency
   - Configure /actuator/metrics
   - Configure /actuator/health

Example metrics implementation:
```kotlin
@Component
class EventMetricsPublisher(
    private val delegate: DomainEventPublisher,
    private val meterRegistry: MeterRegistry
) : DomainEventPublisher {
    
    override fun publish(event: OperationEvent) {
        val timer = Timer.start(meterRegistry)
        try {
            delegate.publish(event)
            meterRegistry.counter(
                "events.published",
                "entityType", event.entityType.name,
                "operation", event.operation.name
            ).increment()
        } catch (e: Exception) {
            meterRegistry.counter("events.failed").increment()
            throw e
        } finally {
            timer.stop(Timer.builder("events.duration")
                .tag("entityType", event.entityType.name)
                .register(meterRegistry))
        }
    }
}
```

Files to create:
- src/main/kotlin/com/itsz/app/monitoring/EventMetricsPublisher.kt
- src/main/kotlin/com/itsz/app/monitoring/RedisHealthIndicator.kt
- src/main/kotlin/com/itsz/app/monitoring/WebSocketHealthIndicator.kt
- src/main/resources/application.yml (update for actuator)
```

---

## Prompt 10: Add Documentation and API Specs

```
Create comprehensive documentation for the Redis WebSocket event system:

1. Create ARCHITECTURE.md:
   - System overview with architecture diagram
   - Component responsibilities
   - Data flow diagrams
   - Sequence diagrams for each operation
   - Technology stack explanation

2. Create EVENT_SCHEMA.md:
   - Document OperationEvent structure
   - List all EntityTypes
   - List all OperationTypes
   - Provide JSON examples
   - Document timestamp format

3. Create WEBSOCKET_API.md:
   - Document WebSocket endpoint URL
   - Connection protocol (STOMP over SockJS)
   - Subscription topics
   - Message formats
   - Client implementation examples (JS/TS)
   - Error handling

4. Create DEPLOYMENT.md:
   - Redis setup instructions
   - Environment variables
   - Docker Compose example
   - Kubernetes manifests
   - Load balancer configuration for WebSocket
   - Monitoring setup

5. Update README.md:
   - Add real-time features section
   - Add quick start for WebSocket
   - Add troubleshooting section

6. Create OpenAPI/Swagger specs:
   - Document all REST endpoints
   - Include event model schemas
   - Add WebSocket documentation

Example EVENT_SCHEMA.md content:
```markdown
# Event Schema Documentation

## OperationEvent

```json
{
  "entityType": "USER",
  "operation": "CREATED",
  "entityId": "12345",
  "entityName": "john.doe",
  "initiatedBy": "admin",
  "timestamp": "2026-03-02T10:30:45.123Z"
}
```

### Fields

- **entityType** (string, required): The type of entity that changed
  - Values: `USER`, `COURSE`, `LESSON`, `ENROLLMENT`
  
- **operation** (string, required): The operation performed
  - Values: `CREATED`, `UPDATED`, `DELETED`
  
- **entityId** (string, nullable): The unique identifier of the entity
  - Format: String representation of database ID
  
- **entityName** (string, nullable): Human-readable identifier
  - For USER: username
  - For COURSE: course title
  
- **initiatedBy** (string, nullable): Username of the user who triggered the event
  - null for system-initiated events
  
- **timestamp** (string, required): ISO 8601 timestamp with milliseconds
```

Files to create:
- docs/ARCHITECTURE.md
- docs/EVENT_SCHEMA.md
- docs/WEBSOCKET_API.md
- docs/DEPLOYMENT.md
- README.md (update)
- src/main/resources/api-docs.yaml
```

---

## Prompt 11: Implement Security for WebSocket

```
Add authentication and authorization for WebSocket connections in a Spring Boot Kotlin application:

1. Create WebSocketSecurityConfig:
   - Extend AbstractSecurityWebSocketMessageBrokerConfigurer
   - Configure channel security
   - Require authentication for /topic/** subscriptions
   - Allow unauthenticated connections to /ws endpoint
   - Validate JWT tokens in WebSocket frames

2. Create WebSocketAuthInterceptor:
   - Implement ChannelInterceptor
   - Extract JWT token from WebSocket connection
   - Validate token and set authentication
   - Reject invalid tokens

3. Update WebSocketConfig:
   - Add interceptor to channel registration
   - Configure CORS for WebSocket
   - Add connection limits per user

4. Add event filtering by user role:
   - Admins see all events
   - Users only see events for their own data
   - Create EventFilter service

Example implementation:
```kotlin
@Configuration
@EnableWebSocketSecurity
class WebSocketSecurityConfig : AbstractSecurityWebSocketMessageBrokerConfigurer() {
    
    override fun configureInbound(messages: MessageSecurityMetadataSourceRegistry) {
        messages
            .simpSubscribeDestMatchers("/topic/**").authenticated()
            .anyMessage().authenticated()
    }
    
    override fun sameOriginDisabled(): Boolean = true
}

@Component
class WebSocketAuthInterceptor(
    private val jwtService: JwtService
) : ChannelInterceptor {
    
    override fun preSend(message: Message<*>, channel: MessageChannel): Message<*>? {
        val accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor::class.java)
        
        if (accessor?.command == StompCommand.CONNECT) {
            val token = accessor.getFirstNativeHeader("Authorization")
                ?.removePrefix("Bearer ")
            
            if (token != null && jwtService.validateToken(token)) {
                val username = jwtService.extractUsername(token)
                val auth = UsernamePasswordAuthenticationToken(username, null, emptyList())
                accessor.user = auth
            } else {
                throw AuthenticationException("Invalid token")
            }
        }
        
        return message
    }
}
```

Files to create:
- src/main/kotlin/com/itsz/app/config/WebSocketSecurityConfig.kt
- src/main/kotlin/com/itsz/app/websocket/WebSocketAuthInterceptor.kt
- src/main/kotlin/com/itsz/app/websocket/EventFilter.kt
```

---

## Prompt 12: Add Error Recovery and Resilience

```
Implement error recovery and resilience patterns for the Redis WebSocket event system:

1. Add Redis connection retry logic:
   - Use Spring Retry with exponential backoff
   - Max 5 retry attempts
   - Log connection failures
   - Circuit breaker pattern

2. Add WebSocket reconnection:
   - Automatic client reconnection on disconnect
   - Exponential backoff strategy
   - Store missed events during disconnect
   - Replay events after reconnection

3. Add event queue for failed publications:
   - Store events in database if Redis unavailable
   - Background job to retry failed events
   - Dead letter queue for permanent failures

4. Add graceful degradation:
   - Application continues if Redis unavailable
   - Log events locally if can't publish
   - Health check reflects degraded state

Example resilience implementation:
```kotlin
@Component
class ResilientRedisEventPublisher(
    private val redisTemplate: RedisTemplate<String, String>,
    private val objectMapper: ObjectMapper,
    private val failedEventRepository: FailedEventRepository
) : DomainEventPublisher {
    
    @Retryable(
        value = [RedisConnectionException::class],
        maxAttempts = 5,
        backoff = Backoff(delay = 1000, multiplier = 2.0)
    )
    override fun publish(event: OperationEvent) {
        try {
            val json = objectMapper.writeValueAsString(event)
            redisTemplate.convertAndSend("domain-events", json)
            logger.info("Published event: ${event.operation} ${event.entityType}")
        } catch (e: RedisConnectionException) {
            logger.error("Redis unavailable, storing event for retry", e)
            failedEventRepository.save(FailedEvent(
                eventData = objectMapper.writeValueAsString(event),
                failedAt = Instant.now(),
                retryCount = 0
            ))
            throw e
        }
    }
}

@Scheduled(fixedDelay = 60000) // Every minute
fun retryFailedEvents() {
    val failedEvents = failedEventRepository.findTop100ByRetryCountLessThanOrderByFailedAtAsc(5)
    failedEvents.forEach { failed ->
        try {
            val event = objectMapper.readValue(failed.eventData, OperationEvent::class.java)
            publish(event)
            failedEventRepository.delete(failed)
        } catch (e: Exception) {
            failedEventRepository.save(failed.copy(retryCount = failed.retryCount + 1))
        }
    }
}
```

Files to create:
- src/main/kotlin/com/itsz/app/event/ResilientRedisEventPublisher.kt
- src/main/kotlin/com/itsz/app/event/FailedEvent.kt
- src/main/kotlin/com/itsz/app/event/FailedEventRepository.kt
- src/main/kotlin/com/itsz/app/event/EventRetryScheduler.kt
- ui/src/utils/websocketReconnection.ts
```

---

## Summary

These 12 prompts provide a complete, step-by-step guide for an AI agent to implement a production-ready real-time event notification system using:

- **Redis Pub/Sub** for event distribution
- **WebSocket** for real-time client updates
- **Spring Boot & Kotlin** for backend
- **React & TypeScript** for frontend
- **Transactional events** for data consistency
- **Security** for authentication & authorization
- **Monitoring** for observability
- **Resilience** for error recovery

Each prompt is:
✅ **Specific** - Clear requirements and file paths
✅ **Contextual** - Includes code examples
✅ **Actionable** - Agent knows exactly what to create
✅ **Complete** - Covers all aspects of the feature
✅ **Grounded** - Based on actual MR changes

The prompts follow a logical order:
1. Core infrastructure (events, Redis)
2. Service integration
3. WebSocket communication
4. Frontend client
5. Testing
6. Monitoring
7. Documentation
8. Security
9. Resilience

An AI agent can execute these prompts sequentially to build the complete system.

