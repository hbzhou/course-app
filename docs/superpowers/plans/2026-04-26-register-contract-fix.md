# Register Contract Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the `POST /api/auth/register` contract mismatch where the frontend sends `name` but the backend expects `username`, and harden the backend with generic Bean Validation so any missing field returns a clear 400 error instead of a 500.

**Architecture:** Add `spring-boot-starter-validation` to the backend; annotate `RegisterRequest` DTO with `@NotBlank`; add `@Valid` to the controller. On the frontend, rename the `name` field to `username` across the API type, form, and tests.

**Tech Stack:** Spring Boot 4 + Kotlin (backend), `jakarta.validation` Bean Validation, React 19 + TypeScript + react-hook-form (frontend), Vitest (frontend tests), JUnit 5 + MockMvc (backend tests).

---

## File Map

| File | Action | What changes |
|---|---|---|
| `api/build.gradle.kts` | Modify | Add `spring-boot-starter-validation` dependency |
| `api/src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt` | Modify | `RegisterRequest` fields become `String?` + `@NotBlank`; controller parameter gets `@Valid` |
| `api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerSessionTest.kt` | Modify | Add test case for missing `username` returning 400 |
| `ui/src/api/authApi.ts` | Modify | `RegisterRequest.name` → `username` |
| `ui/src/pages/auth/Registration.tsx` | Modify | Label, id, placeholder, `register()` binding: `name` → `username` |
| `ui/src/pages/auth/__tests__/Registration.test.tsx` | Modify | Query and expected payload: `name` → `username` |

---

## Task 1: Add Bean Validation Dependency

**Files:**
- Modify: `api/build.gradle.kts`

- [ ] **Step 1: Add the validation starter**

In `api/build.gradle.kts`, add the following line in the `dependencies` block, after `spring-boot-starter-web`:

```kotlin
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")   // add this
    implementation("org.springframework.boot:spring-boot-starter-actuator")
```

- [ ] **Step 2: Verify the project compiles**

```bash
cd /path/to/course-app
./gradlew api:compileKotlin
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: Commit**

```bash
git add api/build.gradle.kts
git commit -m "build: add spring-boot-starter-validation"
```

---

## Task 2: Write the Failing Backend Validation Test

**Files:**
- Modify: `api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerSessionTest.kt`

- [ ] **Step 1: Add the failing test case**

Open `api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerSessionTest.kt` and add this test at the end of the class (before the closing `}`):

```kotlin
@Test
fun `register with missing username returns 400 validation error`() {
    mockMvc.perform(
        org.springframework.test.web.servlet.request.MockMvcRequestBuilders
            .post("/api/auth/register")
            .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
            .content("""{"name":"foo","email":"foo@example.com","password":"secret123"}""")
    ).andExpect(
        org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest
    ).andExpect(
        org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.code").value("VALIDATION_ERROR")
    ).andExpect(
        org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.message").value("Username is required")
    )
}
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
./gradlew api:test --tests "com.itsz.app.auth.controller.AuthControllerSessionTest.register with missing username returns 400 validation error"
```

Expected: FAIL — the endpoint currently returns 500 instead of 400.

---

## Task 3: Harden RegisterRequest with Bean Validation

**Files:**
- Modify: `api/src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt`

- [ ] **Step 1: Add Jakarta validation imports**

At the top of `AuthController.kt`, add:

```kotlin
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
```

- [ ] **Step 2: Update RegisterRequest DTO**

Replace the existing `RegisterRequest` data class at the bottom of `AuthController.kt`:

```kotlin
// Before
data class RegisterRequest(val username: String, val email: String, val password: String)
```

```kotlin
// After
data class RegisterRequest(
    @field:NotBlank(message = "Username is required")
    val username: String?,
    @field:NotBlank(message = "Email is required")
    val email: String?,
    @field:NotBlank(message = "Password is required")
    val password: String?
)
```

- [ ] **Step 3: Add `@Valid` to the register endpoint**

Find the `register` function and add `@Valid`:

```kotlin
// Before
fun register(@RequestBody registerRequest: RegisterRequest): User {
```

```kotlin
// After
fun register(@Valid @RequestBody registerRequest: RegisterRequest): User {
```

- [ ] **Step 4: Fix the register function body to handle nullable fields**

The `registerRequest` fields are now `String?`. Use `!!` (they are guaranteed non-null after `@Valid` passes) or `orEmpty()`. Use `!!` since validation has already ensured they are non-blank:

```kotlin
@PostMapping("/register")
fun register(@Valid @RequestBody registerRequest: RegisterRequest): User {
    val userRole = roleRepository.findByName("ROLE_USER").orElseThrow { ResourceNotFoundException("Role not found") }
    val user = User(
        username = registerRequest.username!!,
        email = registerRequest.email!!,
        password = passwordEncoder.encode(registerRequest.password!!),
        roles = setOf(userRole)
    )
    return userService.create(user)
}
```

- [ ] **Step 5: Run the previously written failing test — it should now pass**

```bash
./gradlew api:test --tests "com.itsz.app.auth.controller.AuthControllerSessionTest.register with missing username returns 400 validation error"
```

Expected: PASS

- [ ] **Step 6: Run all backend tests to check for regressions**

```bash
./gradlew api:test
```

Expected: `BUILD SUCCESSFUL` with all tests passing.

- [ ] **Step 7: Commit**

```bash
git add api/src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt \
        api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerSessionTest.kt
git commit -m "feat: add Bean Validation to RegisterRequest, return 400 on missing fields"
```

---

## Task 4: Fix Frontend RegisterRequest Type

**Files:**
- Modify: `ui/src/api/authApi.ts`

- [ ] **Step 1: Rename the field**

In `ui/src/api/authApi.ts`, find the `RegisterRequest` interface:

```typescript
// Before
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}
```

```typescript
// After
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd ui && npx tsc --noEmit
```

Expected: no errors (the form will break until Task 5).

---

## Task 5: Fix the Registration Form

**Files:**
- Modify: `ui/src/pages/auth/Registration.tsx`

- [ ] **Step 1: Update the form field**

In `ui/src/pages/auth/Registration.tsx`, replace the `name` field block:

```tsx
// Before
<div className="space-y-2">
  <Label htmlFor="name">Name</Label>
  <Input
    id="name"
    placeholder="Enter name"
    {...register("name", { required: true })}
  />
  {errors.name && <span className="text-sm text-destructive">This field is required</span>}
</div>
```

```tsx
// After
<div className="space-y-2">
  <Label htmlFor="username">Username</Label>
  <Input
    id="username"
    placeholder="Enter username"
    {...register("username", { required: true })}
  />
  {errors.username && <span className="text-sm text-destructive">This field is required</span>}
</div>
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd ui && npx tsc --noEmit
```

Expected: no errors.

---

## Task 6: Fix Frontend Tests

**Files:**
- Modify: `ui/src/pages/auth/__tests__/Registration.test.tsx`

- [ ] **Step 1: Update the four affected tests**

Make the following changes in `ui/src/pages/auth/__tests__/Registration.test.tsx`:

**a) "renders registration form" test — update label query:**
```typescript
// Before
expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
```
```typescript
// After
expect(screen.getByLabelText(/^username/i)).toBeInTheDocument();
```

**b) "submits registration form with valid data" test — update input interaction and expected payload:**
```typescript
// Before
await user.type(screen.getByLabelText(/^name/i), "New User");
// ...
expect(authApi.register).toHaveBeenCalledWith({
  name: "New User",
  email: "newuser@example.com",
  password: "password123",
});
```
```typescript
// After
await user.type(screen.getByLabelText(/^username/i), "New User");
// ...
expect(authApi.register).toHaveBeenCalledWith({
  username: "New User",
  email: "newuser@example.com",
  password: "password123",
});
```

**c) "shows error message on registration failure" test — update input interaction:**
```typescript
// Before
await user.type(screen.getByLabelText(/^name/i), "Test User");
```
```typescript
// After
await user.type(screen.getByLabelText(/^username/i), "Test User");
```

**d) "navigates to login after successful registration" test — update input interaction:**
```typescript
// Before
await user.type(screen.getByLabelText(/^name/i), "New User");
```
```typescript
// After
await user.type(screen.getByLabelText(/^username/i), "New User");
```

- [ ] **Step 2: Run the Registration tests**

```bash
cd ui && npm test -- Registration
```

Expected: all 4 tests PASS.

- [ ] **Step 3: Run the full frontend test suite**

```bash
cd ui && npm test
```

Expected: all tests pass, no regressions.

- [ ] **Step 4: Commit**

```bash
git add ui/src/api/authApi.ts \
        ui/src/pages/auth/Registration.tsx \
        ui/src/pages/auth/__tests__/Registration.test.tsx
git commit -m "fix: align registration form field name with backend (name → username)"
```

---

## Task 7: Final Verification

- [ ] **Step 1: Run all backend tests**

```bash
./gradlew api:test
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 2: Run all frontend tests with coverage**

```bash
cd ui && npm test
```

Expected: all 153+ tests pass, coverage unchanged or improved.

- [ ] **Step 3: Run frontend lint**

```bash
cd ui && npm run lint
```

Expected: 0 errors.

- [ ] **Step 4: Smoke test manually (optional but recommended)**

Start the backend: `./gradlew api:bootRun`  
Start the frontend: `cd ui && npm run dev`  
Navigate to `http://localhost:3000/register`, fill in Username/Email/Password, submit.  
Expected: redirect to `/login`.

- [ ] **Step 5: Push**

```bash
./git-push.sh
```
