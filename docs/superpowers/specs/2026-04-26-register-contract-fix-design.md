# Design: Fix Register Endpoint Contract Mismatch

**Date:** 2026-04-26  
**Status:** Approved

---

## Problem

The UI registration form sends `{ name, email, password }` but the backend `RegisterRequest` DTO expects `{ username, email, password }`. Jackson deserializes the absent `username` field as `null`, which propagates into the database layer and produces a 500 Internal Server Error instead of a meaningful 400 validation error.

There are two independent problems:
1. The backend does not validate request fields generically, so any missing/blank required field causes an uncontrolled 500.
2. The frontend form uses the wrong field name (`name` instead of `username`).

---

## Design

### Layer 1 — Generic Backend Validation (Bean Validation)

**Principle:** Use the Spring Boot Validation starter + Jakarta Bean Validation annotations on every DTO. This is the standard Spring idiom and applies generically to any future request DTO without writing custom guard code per endpoint.

**Changes:**

1. Add dependency to `api/build.gradle.kts`:
   ```kotlin
   implementation("org.springframework.boot:spring-boot-starter-validation")
   ```

2. Annotate `RegisterRequest` in `AuthController.kt`:
   ```kotlin
   data class RegisterRequest(
       @field:NotBlank(message = "Username is required")
       val username: String?,
       @field:NotBlank(message = "Email is required")
       val email: String?,
       @field:NotBlank(message = "Password is required")
       val password: String?
   )
   ```
   Fields are typed as `String?` (nullable) so Jackson can deserialize absent fields as `null` rather than throwing a raw deserialization exception before validation runs.

3. Add `@Valid` to the `register()` controller method:
   ```kotlin
   fun register(@Valid @RequestBody registerRequest: RegisterRequest): User
   ```

**Why no handler changes needed:** `GlobalExceptionHandler.handleValidation()` already catches `MethodArgumentNotValidException` and returns:
```json
{ "status": 400, "code": "VALIDATION_ERROR", "message": "Username is required" }
```

**Error flow for old/buggy clients:**
```
POST /api/auth/register { name: "foo", email: "...", password: "..." }
  → username = null
  → @NotBlank fires
  → MethodArgumentNotValidException
  → GlobalExceptionHandler → 400 { "message": "Username is required" }
```

### Layer 2 — Frontend Contract Alignment

Fix the UI so it sends the correct field name, matching the backend contract.

**Files changed:**

| File | Change |
|---|---|
| `ui/src/api/authApi.ts` | `RegisterRequest.name: string` → `username: string` |
| `ui/src/pages/auth/Registration.tsx` | Label `Name` → `Username`; id/placeholder updated; `register("name")` → `register("username")` |
| `ui/src/pages/auth/__tests__/Registration.test.tsx` | `getByLabelText(/^name/i)` → `/^username/i`; expected payload `name:` → `username:` |

No logic changes — only field name alignment.

---

## Architecture Diagram

```mermaid
flowchart LR
    A[Registration Form\nusername field] -->|POST { username, email, password }| B[AuthController\n@Valid @RequestBody]
    B -->|@NotBlank fails| C[GlobalExceptionHandler\nMethodArgumentNotValidException]
    C -->|400 VALIDATION_ERROR| D[UI Error Banner]
    B -->|validation passes| E[UserService.create]
    E --> F[(MySQL)]
```

---

## Out of Scope

- No changes to `LoginRequest` (already uses `username` correctly)
- No DB migration
- No changes to `GlobalExceptionHandler`
- No validation added to other DTOs in this ticket (they can be hardened separately using the same pattern)

---

## Testing

- **Backend:** Add a new test case to the existing `AuthControllerSessionTest` class asserting that `POST /api/auth/register` with an absent `username` field returns `400` with `code: "VALIDATION_ERROR"` and `message: "Username is required"`.
- **Frontend:** Update `Registration.test.tsx` to use the `username` label and payload (4 tests affected).
