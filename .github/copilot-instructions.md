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
cd ui && npm test           # Vitest with coverage (153 tests, 66.45% coverage)
cd ui && npm run lint       # ESLint check (0 errors)

# 6. Git operations (dual remote setup)
./git-push.sh               # Push to both GitHub (origin) and GitLab (origin-epam)
git branch                  # Current: main (production) or feature branches

# 7. Database migrations (via Flyway CLI — run setup once first)
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

### State Management Architecture
- **React Context API** (`ui/src/context/`) — auth state (`AuthContext`) + notifications (`NotificationContext`)
  - `AuthContext` — manages user session, token (persisted in `localStorage`), login/logout
  - `NotificationContext` — manages notification list, unread count, mark as read/clear operations
- **TanStack React Query v5** — all server data (courses, authors, tags, users)
  - 5-min stale time, optimistic updates with rollback on error
  - Pattern: mutations use `onMutate` → optimistic update, `onError` → rollback via context, `onSettled` → invalidate

### Generic CRUD Patterns

**API Layer** (`ui/src/api/`):
- `createCrudApi<T>(endpoint)` — factory returns `{ getAll, create, update, delete }` 
- All entity APIs use this: `courseCrudApi`, `authorCrudApi`, `tagCrudApi`, `userCrudApi`
- `client.ts` → `apiClient<T>()` — reads JWT from `localStorage`, attaches `Authorization: Bearer` header

**Hook Layer** (`ui/src/hooks/`):
- `createCrudHooks<T>(queryKey, api)` — factory returns `{ useQuery, useCreate, useUpdate, useDelete }`
- Entity-specific hooks: `useCourses`, `useAuthors`, `useTags`, `useUsers` (created via factory)
- Auth hooks: `useLogin`, `useRegister`, `useLogout` (custom implementations)
- All mutations include optimistic updates with automatic rollback on error

### Project Structure
```
ui/src/
├── api/              Generic CRUD API factories + entity-specific APIs
├── common/           Reusable UI components (Button, Card, Input, Toast, etc.)
├── context/          React Context providers (Auth, Notification)
├── hooks/            React Query hooks (generic factories + entity-specific)
├── layout/           Layout components (Header, Nav, Profile, NotificationBell)
├── lib/              Utilities (cn classname merger, query config)
├── pages/            Page components organized by feature (auth, courses, authors, tags, users)
├── router/           React Router setup + ProtectedRoute
├── store/            [REMOVED - migrated to Context API]
└── types/            TypeScript type definitions
```

### Path Alias
`@/` maps to `ui/src/` (configured in both `vite.config.ts` and `vitest.config.mts`).

### WebSocket Integration (`useWebSocket.ts`)
Connects to `ws://{host}/ws` using `@stomp/stompjs` `Client` (native WS, not SockJS). 
- Activates when `token` exists in `AuthContext`
- Subscribes to `/topic/notifications` on connection
- Dispatches received notifications to `NotificationContext`
- Auto-deactivates on logout or unmount

### Form Validation
Uses `react-hook-form` + custom validation (no Zod). Forms in `pages/*/AddAuthor.tsx`, `AddTag.tsx`, etc.

### UI Components & Styling
- Custom shadcn/ui-style components in `ui/src/common/` (Button, Card, Input, Label, Textarea, Badge, Toast, etc.)
- Tailwind CSS with custom theme configuration
- All components support className composition via `cn()` utility
- **100% test coverage** on all common components

---

## Testing Strategy

### Frontend Tests (`ui/src/`)
**Test Framework:** Vitest v1.6.1 + @testing-library/react + @testing-library/user-event

**Coverage:** 66.45% overall (153 tests across 29 test files)

**Test Organization:**
```
├── api/              API client + CRUD factory tests (100% coverage)
├── common/           Component tests (97.42% coverage - Button, Card, Input, Badge, Toast, etc.)
├── context/          Context provider tests (100% coverage - Auth, Notification)
├── hooks/            React Query hook tests (82.47% coverage - CRUD hooks, auth hooks)
├── layout/           Layout component tests (68.9% coverage - Header, Nav, Profile)
├── lib/              Utility tests (100% coverage - cn classname merger)
├── pages/            Page integration tests (73% average - Auth, Authors, Courses, Tags)
└── router/           ProtectedRoute tests (100% coverage)
```

**Testing Patterns:**
- **Unit Tests:** Components, hooks, utilities tested in isolation with mocked dependencies
- **Integration Tests:** Pages tested with QueryClient + Context providers
- **Mocking Strategy:**
  - `vi.mock()` for API modules (e.g., `authApi`, `courseCrudApi`)
  - `vi.stubGlobal()` for localStorage with proper mock object
  - QueryClient with `retry: false` for deterministic tests
  - Wrapper pattern: `QueryClientProvider` + `AuthProvider` + `NotificationProvider`

**Coverage Goals:**
- Context/Lib/Router: 100% ✓
- Common Components: 97%+ ✓
- Hooks: 80%+ ✓
- Pages: 70%+ ✓

**Run Tests:**
```bash
cd ui
npm test              # Run all tests with coverage report
npm test -- --watch   # Watch mode (not default)
npm run lint          # ESLint check
```

---

## Database Migrations
- Never modify executed migration files — add new `V{N}__description.sql` files only
- Migrations live in `api/src/main/resources/db/migration/`
- Flyway runs automatically on app startup (`spring.flyway.enabled=true`); `spring.jpa.hibernate.ddl-auto=none`

## Kubernetes / Production
- Helm chart in `k8s/course-app-chart/`; image `jeremygilbert/course-app`
- Health probes: `/actuator/health/liveness` (liveness) and `/actuator/health/readiness` (readiness, includes DB check)
- SPA routing handled server-side in `WebConfig.kt` — unknown paths return `index.html`

## Git Workflow (Dual Remote Setup)
**Remotes configured:**
- `origin` → GitHub: `hbzhou/course-app`
- `origin-epam` → GitLab: `jeremy_zhou/course-app`

**Push to both remotes:**
```bash
./git-push.sh               # Pushes current branch to both remotes
git push -u origin branch   # Push to GitHub only
git push origin-epam branch # Push to GitLab only
```

**Branch Strategy:**
- `main` — production-ready code
- `phase*-*` — feature branches (e.g., `phase7-ui-test-coverage`)
- Each phase merged via PR after testing

## Key Config
| Property | Value |
|---|---|
| API port | `8081` |
| UI dev port | `3000` |
| DB | MySQL `coursedb` @ `localhost:3306` |
| Redis | `localhost:6379` |
| JWT expiry | 10 hours |
| Test coverage | 66.45% (153 tests) |
| Lint status | 0 errors, 10 warnings |
| State management | React Context + React Query |
| Kotlin compiler flag | `-Xannotation-default-target=param-property` (required for Spring annotations on data class constructors) |
