# Course Application

A full-stack web application for managing courses, authors, and users, built with **Spring Boot 4 + Kotlin** on the backend and **React 19 + TypeScript** on the frontend.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot 4, Kotlin 2.3, Spring Data JPA, Spring Security |
| Frontend | React 19, TypeScript, Vite, Redux Toolkit, TanStack React Query |
| Database | MySQL 8 |
| Cache / Messaging | Redis 7.2 |
| Auth | JWT (stateless, 10-hour expiry) |
| Migrations | Flyway 12 |
| Build | Gradle (Kotlin DSL), monorepo |
| Deployment | Docker Compose (dev), Kubernetes / Helm (prod) |

## Features

- **User Management**: Authentication and authorization with JWT
- **Role-Based Access Control**: `ROLE_ADMIN` (full access) and `ROLE_USER` (view-only) with fine-grained permissions (`COURSE_VIEW`, `COURSE_EDIT`, `USER_MANAGE`, `ROLE_MANAGE`)
- **Course Management**: Create, read, update, and delete courses
- **Author Management**: Manage course authors and relationships
- **Real-Time Notifications**: Every DB change is pushed to connected clients via Redis Pub/Sub → STOMP WebSocket (`/topic/notifications`)
- **Database Migrations**: Flyway for versioned database schema management
- **Docker Support**: Docker Compose for MySQL and Redis
- **Health Probes**: Kubernetes-ready liveness (`/actuator/health/liveness`) and readiness (`/actuator/health/readiness`) endpoints
- **Comprehensive Testing**: 153 unit tests (66.45% coverage) + 53 E2E tests covering all workflows

## Quick Start

### Prerequisites

- Java 24+
- Node.js 18+
- Docker and Docker Compose
- Gradle (wrapper included)

### 0. Optional Local Overrides

If you use a local override file, keep custom secrets in `api/src/main/resources/application-local.properties`
and activate it with:

```bash
SPRING_PROFILES_ACTIVE=local ./gradlew api:bootRun
```

Environment variables are still supported for `DB_USERNAME`, `DB_PASSWORD`, `MYSQL_USER`,
`MYSQL_PASSWORD`, `JWT_SECRET`, and `WEBSOCKET_ALLOWED_ORIGINS`.

### 1. Start Infrastructure

```bash
docker compose up -d
```

This starts:
- **MySQL 8** — database `coursedb`, default credentials from compose (or overridden via env), port `3306`
- **Redis 7.2** — port `6379`

### 2. Build and Run the Backend

```bash
./gradlew api:bootRun
```

The API will start on http://localhost:8081

> Spring Boot will also auto-start Docker Compose if it isn't already running (`spring.docker.compose.enabled=true`).

### 3. Build and Run the Frontend

```bash
cd ui
npm install
npm run dev
```

The UI will start on http://localhost:3000

In dev mode, Vite proxies `/api` and `/ws` to `localhost:8081`.

### Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

## Production Build

The UI is bundled directly into the Spring Boot JAR at build time:

```bash
# 1. Build the frontend
cd ui && npm run build      # produces ui/dist/

# 2. Package everything into a single JAR (embeds ui/dist/ into classpath:/public/)
./gradlew api:bootJar
```

The resulting JAR serves the React SPA from `classpath:/public/`. Unknown paths are handled server-side and return `index.html` (SPA routing).

## Database Migrations (Flyway)

This project uses **Flyway CLI 12** for professional database version control. Migration files are located in:
```
api/src/main/resources/db/migration/
```

Flyway runs automatically on app startup. **Never modify migration files that have already been executed** — always add a new versioned file.

### Setup Flyway CLI (One-time)

```bash
./flyway-setup.sh
```

This will:
- Download Flyway CLI 12 (~30MB) + MySQL JDBC driver
- Configure database connection
- **Create `flyway.sh` helper script** ← This is generated for you!

**Note**: `flyway.sh` doesn't exist until you run the setup above.

### Managing Migrations

```bash
./flyway.sh info        # Check migration status
./flyway.sh migrate     # Apply pending migrations
./flyway.sh create      # Scaffold next versioned migration file
./flyway.sh validate    # Validate migrations
./flyway.sh repair      # Repair schema history
./flyway.sh clean       # ⚠️ DEV ONLY — destroys all data!
./flyway.sh help        # Show all commands
```

### Creating New Migrations

```bash
./flyway.sh create
# Enter description: add_user_phone_column
# Creates: V3__add_user_phone_column.sql
```

Then edit the generated file and run `./flyway.sh migrate` to apply it.

For detailed information, see [api/FLYWAY_GUIDE.md](api/FLYWAY_GUIDE.md)

## Tests

### Unit Tests

```bash
./gradlew api:test          # JVM tests (Spring Boot)
cd ui && npm test           # Vitest unit tests (153 tests, 66.45% coverage)
```

### End-to-End Tests

```bash
cd ui
npm run e2e                 # Run all 53 E2E tests
npm run e2e:ui              # Visual test runner
npm run e2e:debug           # Debug mode with Playwright Inspector
npm run e2e:report          # View HTML report
```

See [E2E Testing Guide](E2E_TESTING_GUIDE.md) for detailed documentation.

## Kubernetes / Production

The Helm chart is located at `k8s/course-app-chart/`. Docker image: `jeremygilbert/course-app`.

Health probes are configured as:
- **Liveness**: `/actuator/health/liveness`
- **Readiness**: `/actuator/health/readiness` (includes DB check)

## GraalVM Native Support

### Lightweight Container with Cloud Native Buildpacks

```bash
$ ./gradlew bootBuildImage
$ docker run --rm -p 8080:8080 course-app:0.0.1-SNAPSHOT
```

### Executable with Native Build Tools

> GraalVM 25+ is required.

```bash
$ ./gradlew nativeCompile
$ build/native/nativeCompile/course-app
```

Run tests in a native image:

```bash
$ ./gradlew nativeTest
```

## Reference Documentation

* [Official Gradle documentation](https://docs.gradle.org)
* [Spring Boot Gradle Plugin Reference Guide](https://docs.spring.io/spring-boot/4.0.1/gradle-plugin)
* [GraalVM Native Image Support](https://docs.spring.io/spring-boot/4.0.1/reference/packaging/native-image/introducing-graalvm-native-images.html)
* [Accessing data with MySQL](https://spring.io/guides/gs/accessing-data-mysql/)
* [Building a RESTful Web Service](https://spring.io/guides/gs/rest-service/)
* [Building REST services with Spring](https://spring.io/guides/tutorials/rest/)
