# Copilot Instructions — course-app

## Architecture Overview

**Monorepo** with three Gradle subprojects (`settings.gradle.kts`):
- `api/` — Spring Boot 4 + Kotlin 2.3 backend, port **8081**
- `ui/` — React 19 + TypeScript + Vite frontend, port **3000** (dev), served from `classpath:/public/` in production
- `k8s/` — Helm chart (`k8s/course-app-chart/`)

**Infrastructure (Docker Compose):** MySQL 8 (`coursedb`, user `admin`/`welcome123`) + Redis 7.2 — both required at runtime.

The UI is bundled into the JAR at build time: `tasks.bootJar { from("./../ui/dist") { into("public") } }`. In dev, Vite proxies `/api` and `/ws` to `localhost:8081`.

---

## Critical Developer Workflows

```bash
# 1. Start dependencies
docker compose up -d

# 2. Run backend (also auto-starts Docker Compose via spring.docker.compose.enabled=true)
./gradlew api:bootRun

# 3. Run frontend dev server
cd ui && npm run dev        # http://localhost:3000

# 4. Full production build (bundles UI into JAR)
cd ui && npm run build      # produces ui/dist/
./gradlew api:bootJar       # embeds dist/ into classpath:/public/

# 5. Tests
./gradlew api:test          # JVM tests
cd ui && npm test           # Vitest with coverage (--run, no watch)

# 6. Database migrations (via Flyway CLI — run setup once first)
./flyway-setup.sh           # one-time: downloads Flyway 12 + MySQL driver + creates flyway.sh
./flyway.sh migrate         # apply pending migrations
./flyway.sh create          # scaffold next versioned migration file
./flyway.sh info            # check migration status
```

**Default login:** `admin` / `admin123`

---

## Backend Patterns

### Package Structure (`com.itsz.app`)
```
auth/           JWT auth, User/Role/Permission entities + controllers
config/         SecurityConfig, WebSocketConfig, RedisConfig, WebConfig (SPA fallback)
controller/     CourseController, AuthorController
domain/         Course, Author (implement BaseEntity)
event/          OperationEvent, DomainEventPublisher
notification/   OperationEventListener (Redis pub), RedisNotificationSubscriber (WS broadcast)
repository/     Spring Data JPA repositories
service/        EntityCrudService<T> (abstract CRUD base), CourseService, AuthorService, UserService
```

### `EntityCrudService<T : BaseEntity>` — Generic CRUD Base
All domain services (`CourseService`, `AuthorService`, `UserService`) extend this abstract class. Override hooks:
- `prepareForCreate(entity)` / `prepareForUpdate(existing, incoming, id)` — transform before save
- `assignId(entity, id)` — required for Kotlin data class immutability
- `nameExtractor: (T) -> String?` — provides entity name for event messages

Every CUD operation auto-publishes an `OperationEvent` via `DomainEventPublisher` **after transaction commit**.

### Event Flow: DB Change → Redis Pub/Sub → WebSocket
```
Service.create/update/delete()
  └─ DomainEventPublisher.publish(OperationEvent)       [Spring ApplicationEvent]
       └─ @TransactionalEventListener(AFTER_COMMIT)
            └─ OperationEventListener → Redis channel "course-app-notifications"
                 └─ RedisNotificationSubscriber.onMessage() → SimpMessagingTemplate → /topic/notifications
```
WebSocket endpoint: native STOMP at `/ws` (no SockJS). Channel configured via `app.notification.redis-channel`.

### Security Model
- Stateless JWT (`JwtAuthFilter` before `UsernamePasswordAuthenticationFilter`)
- Permission-based `@PreAuthorize`: `COURSE_VIEW`, `COURSE_EDIT`, `USER_MANAGE`, `ROLE_MANAGE`
- `ROLE_ADMIN` gets all permissions; `ROLE_USER` gets `COURSE_VIEW` only (see `V2__insert_seed_data.sql`)
- Public routes: `/api/auth/**`, `/ws/**`, `/actuator/health/**`, static assets

---

## Frontend Patterns

### State Management Split
- **Redux Toolkit** (`ui/src/store/`) — auth state (`currentUser`) + notifications; token persisted in `localStorage`
- **TanStack React Query** — all server data (courses, authors, users); 5-min stale time, optimistic updates with rollback
- Pattern: mutations use `onMutate` → optimistic update, `onError` → rollback via context, `onSettled` → invalidate

### API Layer (`ui/src/api/`)
`client.ts` → `apiClient<T>()` — reads JWT from `localStorage`, attaches `Authorization: Bearer` header. All API modules use this client.

### Path Alias
`@/` maps to `ui/src/` (configured in both `vite.config.ts` and `vitest.config.mts`).

### WebSocket (`useWebSocket.ts`)
Connects to `ws://{host}/ws` using `@stomp/stompjs` `Client` (native WS, not SockJS). Activates only when `token` is present in Redux store; deactivates on logout. Dispatches to `notificationSlice`.

### UI Components
Custom shadcn/ui-style components live in `ui/src/common/` (Button, Card, Input, Toast, etc.). Feature components in `ui/src/components/`. Form validation uses `react-hook-form` + `zod` + `@hookform/resolvers`.

---

## Database Migrations
- Never modify executed migration files — add new `V{N}__description.sql` files only
- Migrations live in `api/src/main/resources/db/migration/`
- Flyway runs automatically on app startup (`spring.flyway.enabled=true`); `spring.jpa.hibernate.ddl-auto=none`

## Kubernetes / Production
- Helm chart in `k8s/course-app-chart/`; image `jeremygilbert/course-app`
- Health probes: `/actuator/health/liveness` (liveness) and `/actuator/health/readiness` (readiness, includes DB check)
- SPA routing handled server-side in `WebConfig.kt` — unknown paths return `index.html`

## Key Config
| Property | Value |
|---|---|
| API port | `8081` |
| DB | MySQL `coursedb` @ `localhost:3306` |
| Redis | `localhost:6379` |
| JWT expiry | 10 hours |
| Kotlin compiler flag | `-Xannotation-default-target=param-property` (required for Spring annotations on data class constructors) |
