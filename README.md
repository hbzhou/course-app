# Read Me First

The following was discovered as part of building this project:

* The JVM level was changed from '25' to '24' as the Kotlin version does not support Java 25 yet.

# Course Application

A Spring Boot + Kotlin application with React frontend for managing courses, authors, and users.

## Features

- **User Management**: Authentication and authorization with JWT
- **Role-Based Access Control**: Admin and User roles with fine-grained permissions
- **Course Management**: Create, read, update, and delete courses
- **Author Management**: Manage course authors and relationships
- **Database Migrations**: Flyway for versioned database schema management
- **Docker Support**: Docker Compose for MySQL database
- **Health Probes**: Kubernetes-ready liveness and readiness endpoints

## Quick Start

### Prerequisites

- Java 25+ (or Java 24 with Kotlin compatibility)
- Node.js 18+
- Docker and Docker Compose
- Gradle (wrapper included)

### 1. Start the Database

```bash
docker-compose up -d
```

This starts MySQL 8.0 with the following credentials:
- Database: `coursedb`
- User: `admin`
- Password: `welcome123`

### 2. Build and Run the Backend

```bash
./gradlew api:bootRun
```

The API will start on http://localhost:8081

### 3. Build and Run the Frontend

```bash
cd ui
npm install
npm run dev
```

The UI will start on http://localhost:5173

### Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

## Database Migrations (Flyway)

This project uses **Flyway CLI** for professional database version control. Migration files are located in:
```
api/src/main/resources/db/migration/
```

### Setup Flyway CLI (One-time)

Download and configure the official Flyway CLI tool:

```bash
./flyway-setup.sh
```

This will:
- Download Flyway CLI 10.10.0 (~30MB)
- Download MySQL JDBC driver
- Configure database connection
- **Create `flyway.sh` helper script** ← This is generated for you!

**Note**: `flyway.sh` doesn't exist until you run the setup above.

### Managing Migrations

Use the Flyway CLI helper script:

```bash
# Check migration status
./flyway.sh info

# Run pending migrations
./flyway.sh migrate

# Create new migration
./flyway.sh create

# Clean database (⚠️ DEV ONLY - destroys all data!)
./flyway.sh clean

# Validate migrations
./flyway.sh validate

# Repair schema history
./flyway.sh repair

# Show all commands
./flyway.sh help
```

### Creating New Migrations

Use the helper script to create a new migration:

```bash
./flyway.sh create
# Enter description: add_user_phone_column
```

This creates: `V3__add_user_phone_column.sql`

Then:
1. Edit the generated file and add your SQL statements
2. Run `./flyway.sh migrate` to apply it

**Important**: Never modify existing migration files that have been executed!

For detailed information, see [api/FLYWAY_GUIDE.md](api/FLYWAY_GUIDE.md)

# Getting Started

### Reference Documentation

For further reference, please consider the following sections:

* [Official Gradle documentation](https://docs.gradle.org)
* [Spring Boot Gradle Plugin Reference Guide](https://docs.spring.io/spring-boot/4.0.1/gradle-plugin)
* [Create an OCI image](https://docs.spring.io/spring-boot/4.0.1/gradle-plugin/packaging-oci-image.html)
* [GraalVM Native Image Support](https://docs.spring.io/spring-boot/4.0.1/reference/packaging/native-image/introducing-graalvm-native-images.html)
* [Spring Boot DevTools](https://docs.spring.io/spring-boot/4.0.1/reference/using/devtools.html)
* [Spring Web](https://docs.spring.io/spring-boot/4.0.1/reference/web/servlet.html)

### Guides

The following guides illustrate how to use some features concretely:

* [Accessing data with MySQL](https://spring.io/guides/gs/accessing-data-mysql/)
* [Building a RESTful Web Service](https://spring.io/guides/gs/rest-service/)
* [Serving Web Content with Spring MVC](https://spring.io/guides/gs/serving-web-content/)
* [Building REST services with Spring](https://spring.io/guides/tutorials/rest/)

### Additional Links

These additional references should also help you:

* [Gradle Build Scans – insights for your project's build](https://scans.gradle.com#gradle)
* [Configure AOT settings in Build Plugin](https://docs.spring.io/spring-boot/4.0.1/how-to/aot.html)

## GraalVM Native Support

This project has been configured to let you generate either a lightweight container or a native executable.
It is also possible to run your tests in a native image.

### Lightweight Container with Cloud Native Buildpacks

If you're already familiar with Spring Boot container images support, this is the easiest way to get started.
Docker should be installed and configured on your machine prior to creating the image.

To create the image, run the following goal:

```
$ ./gradlew bootBuildImage
```

Then, you can run the app like any other container:

```
$ docker run --rm -p 8080:8080 course-app:0.0.1-SNAPSHOT
```

### Executable with Native Build Tools

Use this option if you want to explore more options such as running your tests in a native image.
The GraalVM `native-image` compiler should be installed and configured on your machine.

NOTE: GraalVM 25+ is required.

To create the executable, run the following goal:

```
$ ./gradlew nativeCompile
```

Then, you can run the app as follows:

```
$ build/native/nativeCompile/course-app
```

You can also run your existing tests suite in a native image.
This is an efficient way to validate the compatibility of your application.

To run your existing tests in a native image, run the following goal:

```
$ ./gradlew nativeTest
```

### Gradle Toolchain support

There are some limitations regarding Native Build Tools and Gradle toolchains.
Native Build Tools disable toolchain support by default.
Effectively, native image compilation is done with the JDK used to execute Gradle.
You can read more
about [toolchain support in the Native Build Tools here](https://graalvm.github.io/native-build-tools/latest/gradle-plugin.html#configuration-toolchains).

