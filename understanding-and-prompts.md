# What These Changes Implement

## Feature: Real-Time Notifications via Redis Pub/Sub + WebSocket (STOMP)

The entire changeset implements a **real-time notification system** that pushes live alerts to the browser whenever a Course, Author, or User is created, updated, or deleted.

### Architecture (end-to-end flow)

```
Service method (mutates DB)
  → publishes OperationEvent (Spring ApplicationEvent)
    → TransactionalNotificationListener (fires AFTER_COMMIT)
      → serializes to JSON → publishes to Redis channel
        → RedisNotificationSubscriber (listens to Redis channel)
          → broadcasts to WebSocket topic /topic/notifications
            → useWebSocket() hook (React, @stomp/stompjs)
              → dispatches addNotification action to Redux
                → NotificationBell (popover) + ToastContainer (toast pop-up)
```

---

## Backend Changes (Spring Boot / Kotlin)

| Change | Purpose |
|---|---|
| `build.gradle.kts` | Add `spring-boot-starter-websocket` + `spring-boot-starter-data-redis` |
| `application.properties` | Add Redis host/port + custom channel name `app.notification.redis-channel` |
| `docker-compose.yml` | Add a `redis:7.2-alpine` service with health check |
| `WebSocketConfig.kt` *(new)* | Enable STOMP broker; `/ws` endpoint (native WebSocket, no SockJS); `/topic` broker prefix; `/app` app prefix |
| `RedisConfig.kt` *(new)* | Wire `RedisMessageListenerContainer` to listen on the configured channel and route to `RedisNotificationSubscriber` |
| `event/OperationEvent.kt` *(new)* | Data class + enums (`EntityType`, `OperationType`) describing what happened |
| `event/DomainEventPublisher.kt` *(new)* | Thin Spring component wrapping `ApplicationEventPublisher` |
| `notification/NotificationMessage.kt` *(new)* | DTO that is JSON-serialized and pushed to Redis |
| `notification/TransactionalNotificationListener.kt` *(new)* | `@TransactionalEventListener(AFTER_COMMIT)` — converts `OperationEvent` → JSON → Redis pub |
| `notification/RedisNotificationSubscriber.kt` *(new)* | `MessageListener` — receives from Redis → broadcasts via `SimpMessagingTemplate` to `/topic/notifications` |
| `SecurityConfig.kt` | Permit `/ws/**` without authentication |
| `CourseService.kt` | Each mutating method (`create/update/delete`) is `@Transactional` + publishes an `OperationEvent` with entity type, operation, entity name, and current user |
| `AuthorService.kt` | Same pattern as CourseService for AUTHOR |
| `UserService.kt` | Same pattern for USER |
| `AuthController.kt` | Minor: adds `@DeleteMapping` endpoint (user deletion) + proper `ResponseEntity` returns |

---

## Frontend Changes (React / TypeScript)

| Change | Purpose |
|---|---|
| `package.json` | Add `@stomp/stompjs`, `@radix-ui/react-popover`, `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`, `@radix-ui/react-toast` |
| `vite.config.ts` | Add `/ws` proxy entry pointing to the backend so WebSocket upgrades work in dev |
| `types/notification.d.ts` *(new)* | TypeScript types: `NotificationMessage`, `Notification`, `OperationType`, `EntityType` |
| `store/notification/notification.slice.ts` *(new)* | Redux slice: `addNotification` (builds human-readable message, caps at 50), `markAllRead`, `clearNotifications` |
| `store/store.ts` | Register `notificationReducer`; export `selectNotifications` and `selectUnreadCount` selectors |
| `store/auth/auth.slice.ts` | Minor: explicit `initialState` object |
| `hooks/useWebSocket.ts` *(new)* | Custom hook — connects via `@stomp/stompjs` to `/ws`, subscribes to `/topic/notifications`, dispatches `addNotification`; connects only when authenticated, cleans up on logout |
| `common/Badge.tsx` *(new)* | Radix-free badge component (CVA variants: default, secondary, destructive, outline) |
| `common/Popover.tsx` *(new)* | Radix Popover wrapper |
| `common/ScrollArea.tsx` *(new)* | Radix ScrollArea wrapper |
| `common/Separator.tsx` *(new)* | Radix Separator wrapper |
| `common/Toast.tsx` *(new)* | Radix Toast wrapper with `created`/`updated`/`deleted` color variants |
| `components/Notifications/NotificationBell.tsx` *(new)* | Bell icon in the header; shows unread badge count; opens popover with scrollable notification list; marks all read on open; "Clear all" button |
| `components/Notifications/ToastContainer.tsx` *(new)* | Shows last 5 unread notifications as auto-dismissing toasts (5 s); color-coded by operation type |
| `components/Header/Header.tsx` | Mount `<NotificationBell />` in the header |
| `App.tsx` | Mount `<ToastContainer />` at the app root |

---

# Prompts to Reproduce This Feature From Scratch

Use these prompts **in order**. Each is self-contained and grounded in the actual project structure.

---

## Prompt 1 — Backend Infrastructure (Redis + WebSocket)

> **Context:** This is a Spring Boot + Kotlin project (Gradle Kotlin DSL). The API module lives in `api/`. There is an existing `docker-compose.yml` at the repo root and `application.properties` at `api/src/main/resources/`.
>
> **Task:** Add Redis and WebSocket infrastructure to the backend.
>
> 1. In `api/build.gradle.kts`, add dependencies `spring-boot-starter-websocket` and `spring-boot-starter-data-redis`.
> 2. In `api/src/main/resources/application.properties`, add:
>    - `spring.data.redis.host=localhost`, `spring.data.redis.port=6379`
>    - A custom property `app.notification.redis-channel=course-app-notifications`
> 3. In `docker-compose.yml`, add a `redis:7.2-alpine` service named `course-app-redis`, port `6379:6379`, with a `redis-cli ping` health check.
> 4. Create `api/src/main/kotlin/com/itsz/app/config/WebSocketConfig.kt`:
>    - Annotate with `@Configuration @EnableWebSocketMessageBroker`
>    - Enable simple in-memory broker on `/topic` prefix
>    - Set application destination prefix to `/app`
>    - Register a **native WebSocket** (no SockJS) endpoint at `/ws` with `setAllowedOriginPatterns("*")`
> 5. In `api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt`, add `.requestMatchers("/ws/**").permitAll()` so the WebSocket handshake is not blocked by JWT filter.

---

## Prompt 2 — Backend Domain Events

> **Context:** Same Spring Boot/Kotlin project. Package root is `com.itsz.app`.
>
> **Task:** Create a lightweight domain event system.
>
> 1. Create `com/itsz/app/event/OperationEvent.kt`:
>    - `enum class EntityType { COURSE, AUTHOR, USER }`
>    - `enum class OperationType { CREATED, UPDATED, DELETED }`
>    - `data class OperationEvent(entityType, operation, entityId: String?, entityName: String?, initiatedBy: String? = null, timestamp: Long = System.currentTimeMillis())`
> 2. Create `com/itsz/app/event/DomainEventPublisher.kt`:
>    - `@Component` wrapping Spring's `ApplicationEventPublisher`
>    - Single method `fun publish(event: OperationEvent)`

---

## Prompt 3 — Backend Notification Pipeline (Redis Pub/Sub)

> **Context:** Same Spring Boot/Kotlin project. The `OperationEvent` and `DomainEventPublisher` from Prompt 2 are already in place.
>
> **Task:** Create the notification pipeline that converts domain events into Redis messages and then broadcasts them over WebSocket.
>
> 1. Create `com/itsz/app/notification/NotificationMessage.kt` — a data class mirroring `OperationEvent` fields as plain strings (for JSON serialization).
> 2. Create `com/itsz/app/notification/TransactionalNotificationListener.kt`:
>    - `@Component` with `StringRedisTemplate` and `ObjectMapper` injected
>    - `@Value("\${app.notification.redis-channel}")` for the channel name
>    - A method annotated `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` that converts `OperationEvent` → `NotificationMessage` → JSON string → `redisTemplate.convertAndSend(channel, json)`
> 3. Create `com/itsz/app/notification/RedisNotificationSubscriber.kt`:
>    - `@Component` implementing `MessageListener`
>    - Inject `SimpMessagingTemplate` with `@Lazy` to avoid circular bean dependency
>    - `onMessage()` reads the Redis message body as a String and calls `messagingTemplate.convertAndSend("/topic/notifications", payload)`
> 4. Create `com/itsz/app/config/RedisConfig.kt`:
>    - `@Configuration` that wires a `RedisMessageListenerContainer` bean
>    - Reads `app.notification.redis-channel` via `@Value`
>    - Registers `RedisNotificationSubscriber` as a `MessageListenerAdapter` on a `ChannelTopic`

---

## Prompt 4 — Instrument Services to Publish Events

> **Context:** The following services already exist and manage CRUD operations. `DomainEventPublisher` is now available. Services are in `com.itsz.app.service` and `com.itsz.app.auth.service`.
>
> **Task:** Update `CourseService`, `AuthorService`, and `UserService` (auth) so that every mutating operation publishes an `OperationEvent` **inside a transaction**.
>
> For each service and each mutating method (`create`, `update`, `delete`):
> 1. Inject `DomainEventPublisher` via constructor.
> 2. Annotate the method with `@Transactional`.
> 3. After the DB operation completes (but before returning), call `eventPublisher.publish(OperationEvent(entityType = EntityType.X, operation = OperationType.Y, entityId = ..., entityName = ..., initiatedBy = currentUser()))`.
> 4. Add a private helper `fun currentUser(): String? = SecurityContextHolder.getContext().authentication?.name`.
>
> Note: For `delete`, fetch the entity first (to capture its name) before deleting, so the event contains a meaningful `entityName`.

---

## Prompt 5 — Frontend: Types, Redux Slice, WebSocket Hook

> **Context:** React + TypeScript + Redux Toolkit app in `ui/src/`. Existing slices follow the pattern in `ui/src/store/course/course.slice.ts`. The `@stomp/stompjs` package needs to be installed.
>
> **Task:**
>
> 1. Add to `ui/package.json` dependencies: `@stomp/stompjs` and the Radix primitives `@radix-ui/react-popover`, `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`, `@radix-ui/react-toast`. Run `npm install`.
> 2. Create `ui/src/types/notification.d.ts` with:
>    - `type EntityType = "COURSE" | "AUTHOR" | "USER"`
>    - `type OperationType = "CREATED" | "UPDATED" | "DELETED"`
>    - `interface NotificationMessage { entityType, operation, entityId, entityName, initiatedBy, timestamp }`
>    - `interface Notification { id: string; message: string; entityType; operation; entityId; timestamp; read: boolean }`
> 3. Create `ui/src/store/notification/notification.slice.ts` (Redux Toolkit slice):
>    - State: `{ notifications: Notification[] }`
>    - `addNotification(msg: NotificationMessage)`: builds a human-readable message like `"Course "X" was created by alice."`, prepends to array, caps at 50
>    - `markAllRead()`: sets all `read = true`
>    - `clearNotifications()`: empties array
> 4. Register `notificationReducer` in `ui/src/store/store.ts` and add two selectors: `selectNotifications` and `selectUnreadCount` (count of items where `read === false`).
> 5. Create `ui/src/hooks/useWebSocket.ts`:
>    - Uses `@stomp/stompjs` `Client`
>    - Derives WebSocket URL from `window.location` (ws:// or wss://) pointing to `/ws`
>    - Reads `token` from Redux state (`state.currentUser.token`)
>    - Connects **only when token is present**, disconnects on logout
>    - Subscribes to `/topic/notifications`, parses JSON frame body as `NotificationMessage`, dispatches `notificationActions.addNotification`
> 6. In `ui/vite.config.ts`, add a proxy entry for `/ws` pointing to the backend (`target: 'http://localhost:8080'`, `ws: true`, `changeOrigin: false`).

---

## Prompt 6 — Frontend: Notification UI Components

> **Context:** React/TypeScript project. Radix primitives and `class-variance-authority` are already installed. There is a `cn()` utility at `@/lib/utils`. Existing common components live in `ui/src/common/`.
>
> **Task:** Create all notification UI pieces.
>
> 1. `ui/src/common/Badge.tsx` — CVA-based badge with variants: `default`, `secondary`, `destructive`, `outline`.
> 2. `ui/src/common/Popover.tsx` — Thin wrapper over `@radix-ui/react-popover` exporting `Popover`, `PopoverTrigger`, `PopoverAnchor`, `PopoverContent` (with standard shadcn-style animation classes).
> 3. `ui/src/common/ScrollArea.tsx` — Wrapper over `@radix-ui/react-scroll-area` exporting `ScrollArea` and `ScrollBar`.
> 4. `ui/src/common/Separator.tsx` — Wrapper over `@radix-ui/react-separator`.
> 5. `ui/src/common/Toast.tsx` — Wrapper over `@radix-ui/react-toast` with CVA variants `created` (green), `updated` (blue), `deleted` (red). Export `ToastProvider`, `ToastViewport`, `Toast`, `ToastTitle`, `ToastDescription`, `ToastClose`, `ToastAction`, `ToastProps`.
> 6. `ui/src/components/Notifications/NotificationBell.tsx`:
>    - Bell icon (lucide-react) with a destructive `Badge` showing unread count (capped at "9+")
>    - Wrapped in a `Popover`; on open → dispatch `markAllRead`
>    - Popover shows a `ScrollArea` (height 72) listing all notifications with color-coded operation text and timestamp
>    - "Clear all" button dispatches `clearNotifications`
> 7. `ui/src/components/Notifications/ToastContainer.tsx`:
>    - Shows the **last 5 unread** notifications as auto-dismissing toasts (5000 ms)
>    - Color variant matches operation type (created=green, updated=blue, deleted=red)
>    - On close dispatches `markAllRead`
> 8. In `ui/src/components/Header/Header.tsx`, mount `<NotificationBell />` alongside the existing profile/nav components.
> 9. In `ui/src/App.tsx`, mount `<ToastContainer />` at the root level (alongside the router) so toasts appear on every page.
> 10. Call the `useWebSocket()` hook once at the app root level (e.g., inside `App.tsx` or a top-level layout component) so the connection is established after login.

