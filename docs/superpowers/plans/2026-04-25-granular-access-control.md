# Granular UI Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add permission-based UI access control so action buttons and restricted routes are hidden/blocked based on the authenticated user's permissions.

**Architecture:** Permissions are fetched from `/api/auth/me` on session init and stored in `AuthContext`. A `usePermission()` hook exposes boolean checks to components. A `PermissionRoute` guards restricted routes with either a 403 page (for `/users`) or a silent redirect (for `/courses/add`). Buttons/links are conditionally rendered in each page component.

**Tech Stack:** Kotlin/Spring Boot (backend), React 19 + TypeScript + Vitest + @testing-library/react (frontend)

---

## File Map

**Created:**
- `api/src/main/resources/db/migration/V5__add_author_permissions.sql` — adds `AUTHOR_EDIT` permission
- `ui/src/hooks/usePermission.ts` — hook: `usePermission(permission: string): boolean`
- `ui/src/router/PermissionRoute.tsx` — route guard component
- `ui/src/common/AccessDenied.tsx` — 403 page with countdown redirect
- `ui/src/hooks/__tests__/usePermission.test.tsx` — hook tests
- `ui/src/router/__tests__/PermissionRoute.test.tsx` — route guard tests
- `ui/src/common/__tests__/AccessDenied.test.tsx` — 403 page tests

**Modified:**
- `api/src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt` — add `permissions` to `/api/auth/me` response
- `ui/src/api/authApi.ts` — add `permissions: string[]` to `CurrentUserResponse`
- `ui/src/context/auth-context.ts` — add `permissions: string[]` to `AuthenticatedUser`
- `ui/src/context/AuthContext.tsx` — parse and store `permissions` from `/api/auth/me`
- `ui/src/context/__tests__/AuthContext.test.tsx` — update tests to include `permissions`
- `ui/src/App.tsx` — wrap `/users` and `/courses/add` routes with `PermissionRoute`
- `ui/src/layout/Nav.tsx` — hide Users link without `USER_MANAGE`
- `ui/src/pages/courses/Courses.tsx` — hide Add Course button without `COURSE_EDIT`
- `ui/src/pages/courses/CourseCard.tsx` — hide Edit/Delete without `COURSE_EDIT`
- `ui/src/pages/courses/CourseInfo.tsx` — hide Edit/Delete without `COURSE_EDIT`
- `ui/src/pages/authors/Authors.tsx` — hide Add Author button without `AUTHOR_EDIT`
- `ui/src/pages/authors/AuthorItem.tsx` — hide Edit/Delete without `AUTHOR_EDIT`
- `ui/src/pages/tags/Tags.tsx` — hide Add Tag button without `TAG_EDIT`
- `ui/src/pages/tags/TagItem.tsx` — hide Edit/Delete without `TAG_EDIT`
- `ui/src/pages/users/Users.tsx` — hide Add User button without `USER_MANAGE`
- `ui/src/pages/users/UserItem.tsx` — hide Edit/Delete without `USER_MANAGE`

---

## Task 1: Backend — Add AUTHOR_EDIT permission migration

**Files:**
- Create: `api/src/main/resources/db/migration/V5__add_author_permissions.sql`

> Note: `TAG_EDIT` already exists from V4. This migration only adds `AUTHOR_EDIT`.

- [ ] **Step 1: Create the migration file**

```sql
-- Author-domain permissions
INSERT INTO permission (name) VALUES ('AUTHOR_EDIT');

-- ROLE_ADMIN: gets author edit permission
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.name = 'AUTHOR_EDIT'
WHERE r.name = 'ROLE_ADMIN';
```

- [ ] **Step 2: Verify migration runs (requires running app)**

Start the app with `./gradlew api:bootRun` and check the logs for:
```
Successfully applied 1 migration to schema `coursedb` (execution time ...)
```
Or run: `./flyway.sh info` and confirm V5 shows as `Success`.

- [ ] **Step 3: Commit**

```bash
git add api/src/main/resources/db/migration/V5__add_author_permissions.sql
git commit -m "feat: add AUTHOR_EDIT permission migration (V5)"
```

---

## Task 2: Backend — Return permissions from /api/auth/me

**Files:**
- Modify: `api/src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt`

The `Authentication` principal already has all permissions as `GrantedAuthority` entries (added by `UserDetailsServiceImpl` and `OAuth2AuthorityMapper`). We filter for non-role entries (i.e., entries that do NOT start with `ROLE_`).

- [ ] **Step 1: Write the failing test**

In `api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerSessionTest.kt`, find the existing test for `GET /api/auth/me` and add a new test asserting the `permissions` field is present:

```kotlin
@Test
fun `me endpoint returns permissions for authenticated user`() {
    mockMvc.get("/api/auth/me") {
        with(httpBasic("admin", "admin123"))
    }.andExpect {
        status { isOk() }
        jsonPath("$.permissions") { isArray() }
        jsonPath("$.permissions", hasItem("COURSE_VIEW"))
        jsonPath("$.permissions", hasItem("COURSE_EDIT"))
    }
}
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
./gradlew api:test --tests "*AuthControllerSessionTest*me*permissions*"
```

Expected: FAIL — `permissions` key is missing from the response.

- [ ] **Step 3: Update the `me()` response to include permissions**

In `AuthController.kt`, find the `me()` function. Change all three response branches to extract permissions from the authentication's authorities:

```kotlin
@GetMapping("/me")
fun me(authentication: Authentication?): ResponseEntity<Map<String, Any>> {
    if (authentication == null || !authentication.isAuthenticated) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
    }

    val permissions = authentication.authorities
        .map { it.authority }
        .filter { !it.startsWith("ROLE_") }

    val principal = authentication.principal
    return when (principal) {
        is Jwt -> ResponseEntity.ok(
            mapOf(
                "name" to (principal.subject ?: "unknown"),
                "email" to (principal.getClaimAsString("email") ?: "unknown@example.com"),
                "provider" to "legacy",
                "authType" to "bearer",
                "permissions" to permissions
            )
        )
        is OAuth2User -> ResponseEntity.ok(
            mapOf(
                "name" to (
                    principal.getAttribute<String>("username")
                        ?: principal.getAttribute<String>("preferred_username")
                        ?: principal.name
                ),
                "email" to (principal.getAttribute<String>("email") ?: "unknown@example.com"),
                "provider" to (principal.getAttribute<String>("provider") ?: "unknown"),
                "authType" to "session",
                "permissions" to permissions
            )
        )
        else -> ResponseEntity.ok(
            mapOf(
                "name" to authentication.name,
                "email" to "unknown@example.com",
                "provider" to "legacy",
                "authType" to "session",
                "permissions" to permissions
            )
        )
    }
}
```

> Note: The return type changes from `Map<String, String>` to `Map<String, Any>` because `permissions` is a `List<String>`.

- [ ] **Step 4: Run the test to confirm it passes**

```bash
./gradlew api:test --tests "*AuthControllerSessionTest*"
```

Expected: PASS

- [ ] **Step 5: Run all backend tests**

```bash
./gradlew api:test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add api/src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt
git commit -m "feat: include permissions in /api/auth/me response"
```

---

## Task 3: Frontend types — Add permissions to AuthenticatedUser and CurrentUserResponse

**Files:**
- Modify: `ui/src/api/authApi.ts`
- Modify: `ui/src/context/auth-context.ts`

- [ ] **Step 1: Update `CurrentUserResponse` in `authApi.ts`**

Find:
```ts
export interface CurrentUserResponse {
  name: string;
  email: string;
  provider: string;
  authType: "bearer" | "session";
}
```

Replace with:
```ts
export interface CurrentUserResponse {
  name: string;
  email: string;
  provider: string;
  authType: "bearer" | "session";
  permissions: string[];
}
```

- [ ] **Step 2: Update `AuthenticatedUser` in `auth-context.ts`**

Find:
```ts
export interface AuthenticatedUser {
  name: string;
  email: string;
  provider?: string;
  authType: "legacy" | "bearer" | "session";
}
```

Replace with:
```ts
export interface AuthenticatedUser {
  name: string;
  email: string;
  provider?: string;
  authType: "legacy" | "bearer" | "session";
  permissions: string[];
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd ui && npx tsc --noEmit
```

Expected: Errors about `AuthContext.tsx` not providing `permissions` — that's expected and fixed in Task 4.

---

## Task 4: Frontend — Store permissions in AuthContext

**Files:**
- Modify: `ui/src/context/AuthContext.tsx`
- Modify: `ui/src/context/__tests__/AuthContext.test.tsx`

- [ ] **Step 1: Update `AuthContext.tsx` to pass permissions through**

In `refreshSession`, find the `setUser(...)` call and add `permissions`:

```ts
setUser({
  name: sessionUser.name,
  email: sessionUser.email,
  provider: sessionUser.provider,
  authType: sessionUser.authType,
  permissions: sessionUser.permissions ?? [],
});
```

In `login`, add `permissions: []` (login doesn't have the full session user yet — permissions are loaded by `refreshSession`):

```ts
const login = (userData: User) => {
  setUser({
    name: userData.username,
    email: userData.email,
    authType: "session",
    permissions: [],
  });
  setAuthStatus("authenticated");
};
```

- [ ] **Step 2: Update `AuthContext.test.tsx` to include permissions in mock responses**

Find every `mockResolvedValue` call for `getCurrentUser` and add `permissions`:

```ts
vi.mocked(authApi.getCurrentUser).mockResolvedValue({
  name: "testuser",
  email: "test@example.com",
  provider: "azure",
  authType: "session",
  permissions: ["COURSE_VIEW"],
});
```

Also update any `expect(result.current.user).toEqual(...)` assertions to include `permissions`:

```ts
expect(result.current.user).toEqual({
  name: "testuser",
  email: "test@example.com",
  provider: "azure",
  authType: "session",
  permissions: ["COURSE_VIEW"],
});
```

- [ ] **Step 3: Run AuthContext tests**

```bash
cd ui && npm test -- AuthContext
```

Expected: All pass.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd ui && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add ui/src/api/authApi.ts ui/src/context/auth-context.ts ui/src/context/AuthContext.tsx ui/src/context/__tests__/AuthContext.test.tsx
git commit -m "feat: add permissions to AuthContext and CurrentUserResponse types"
```

---

## Task 5: Frontend — usePermission hook

**Files:**
- Create: `ui/src/hooks/usePermission.ts`
- Create: `ui/src/hooks/__tests__/usePermission.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `ui/src/hooks/__tests__/usePermission.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermission } from "../usePermission";
import { useAuthContext } from "@/context/auth-context";

vi.mock("@/context/auth-context", () => ({
  useAuthContext: vi.fn(),
}));

describe("usePermission", () => {
  it("returns true when user has the permission", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: { name: "admin", email: "", authType: "session", permissions: ["COURSE_EDIT", "COURSE_VIEW"] },
      authStatus: "authenticated",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    const { result } = renderHook(() => usePermission("COURSE_EDIT"));
    expect(result.current).toBe(true);
  });

  it("returns false when user lacks the permission", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: { name: "user", email: "", authType: "session", permissions: ["COURSE_VIEW"] },
      authStatus: "authenticated",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    const { result } = renderHook(() => usePermission("COURSE_EDIT"));
    expect(result.current).toBe(false);
  });

  it("returns false when user is not authenticated", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      authStatus: "anonymous",
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    const { result } = renderHook(() => usePermission("COURSE_EDIT"));
    expect(result.current).toBe(false);
  });

  it("returns false during auth loading", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      authStatus: "loading",
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    const { result } = renderHook(() => usePermission("COURSE_VIEW"));
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd ui && npm test -- usePermission
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `usePermission.ts`**

Create `ui/src/hooks/usePermission.ts`:

```ts
import { useAuthContext } from "@/context/auth-context";

export function usePermission(permission: string): boolean {
  const { user, authStatus } = useAuthContext();
  if (authStatus !== "authenticated" || !user) return false;
  return user.permissions.includes(permission);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd ui && npm test -- usePermission
```

Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add ui/src/hooks/usePermission.ts ui/src/hooks/__tests__/usePermission.test.tsx
git commit -m "feat: add usePermission hook"
```

---

## Task 6: Frontend — AccessDenied component

**Files:**
- Create: `ui/src/common/AccessDenied.tsx`
- Create: `ui/src/common/__tests__/AccessDenied.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `ui/src/common/__tests__/AccessDenied.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import AccessDenied from "../AccessDenied";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

describe("AccessDenied", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 403 heading and message", () => {
    render(<MemoryRouter><AccessDenied /></MemoryRouter>);
    expect(screen.getByText(/403/)).toBeInTheDocument();
    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
  });

  it("shows initial countdown of 5", () => {
    render(<MemoryRouter><AccessDenied /></MemoryRouter>);
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it("decrements countdown every second", () => {
    render(<MemoryRouter><AccessDenied /></MemoryRouter>);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(/4/)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it("navigates to /courses after 5 seconds", () => {
    render(<MemoryRouter><AccessDenied /></MemoryRouter>);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(mockNavigate).toHaveBeenCalledWith("/courses", { replace: true });
  });

  it("renders a link to /courses for immediate navigation", () => {
    render(<MemoryRouter><AccessDenied /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Go to Courses/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd ui && npm test -- AccessDenied
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `AccessDenied.tsx`**

Create `ui/src/common/AccessDenied.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const REDIRECT_SECONDS = 5;

const AccessDenied = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (countdown <= 0) {
      navigate("/courses", { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <main className="container mx-auto px-4 py-20 flex flex-col items-center justify-center gap-6 text-center">
      <div className="text-8xl font-extrabold text-destructive">403</div>
      <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
      <p className="text-muted-foreground max-w-md">
        You don't have permission to view this page. Redirecting to Courses in{" "}
        <span className="font-semibold text-foreground">{countdown}</span> second{countdown !== 1 ? "s" : ""}...
      </p>
      <Link
        to="/courses"
        className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
      >
        Go to Courses
      </Link>
    </main>
  );
};

export default AccessDenied;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd ui && npm test -- AccessDenied
```

Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add ui/src/common/AccessDenied.tsx ui/src/common/__tests__/AccessDenied.test.tsx
git commit -m "feat: add AccessDenied 403 page with countdown redirect"
```

---

## Task 7: Frontend — PermissionRoute component

**Files:**
- Create: `ui/src/router/PermissionRoute.tsx`
- Create: `ui/src/router/__tests__/PermissionRoute.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `ui/src/router/__tests__/PermissionRoute.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PermissionRoute from "../PermissionRoute";
import { usePermission } from "@/hooks/usePermission";

vi.mock("@/hooks/usePermission", () => ({ usePermission: vi.fn() }));
vi.mock("@/common/AccessDenied", () => ({ default: () => <div>Access Denied Page</div> }));

describe("PermissionRoute", () => {
  it("renders children when user has permission", () => {
    vi.mocked(usePermission).mockReturnValue(true);
    render(
      <MemoryRouter>
        <PermissionRoute required="COURSE_EDIT" deny="403">
          <div>Protected Content</div>
        </PermissionRoute>
      </MemoryRouter>
    );
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("renders AccessDenied when user lacks permission and deny=403", () => {
    vi.mocked(usePermission).mockReturnValue(false);
    render(
      <MemoryRouter>
        <PermissionRoute required="COURSE_EDIT" deny="403">
          <div>Protected Content</div>
        </PermissionRoute>
      </MemoryRouter>
    );
    expect(screen.getByText("Access Denied Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to /courses when user lacks permission and deny=redirect", () => {
    vi.mocked(usePermission).mockReturnValue(false);
    render(
      <MemoryRouter initialEntries={["/courses/add"]}>
        <Routes>
          <Route
            path="/courses/add"
            element={
              <PermissionRoute required="COURSE_EDIT" deny="redirect">
                <div>Create Course</div>
              </PermissionRoute>
            }
          />
          <Route path="/courses" element={<div>Courses Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Courses Page")).toBeInTheDocument();
    expect(screen.queryByText("Create Course")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd ui && npm test -- PermissionRoute
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `PermissionRoute.tsx`**

Create `ui/src/router/PermissionRoute.tsx`:

```tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermission } from "@/hooks/usePermission";
import AccessDenied from "@/common/AccessDenied";

type PermissionRouteProps = {
  children: ReactNode;
  required: string;
  deny: "403" | "redirect";
};

const PermissionRoute = ({ children, required, deny }: PermissionRouteProps) => {
  const hasPermission = usePermission(required);

  if (!hasPermission) {
    if (deny === "403") return <AccessDenied />;
    return <Navigate to="/courses" replace />;
  }

  return children;
};

export default PermissionRoute;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd ui && npm test -- PermissionRoute
```

Expected: All 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add ui/src/router/PermissionRoute.tsx ui/src/router/__tests__/PermissionRoute.test.tsx
git commit -m "feat: add PermissionRoute component"
```

---

## Task 8: Frontend — Wire PermissionRoute into App.tsx

**Files:**
- Modify: `ui/src/App.tsx`

- [ ] **Step 1: Import PermissionRoute**

Add import at the top of `App.tsx` alongside `ProtectedRoute`:

```tsx
import PermissionRoute from "@/router/PermissionRoute";
```

- [ ] **Step 2: Wrap the `/users` route**

Find:
```tsx
<Route path='/users' element={<Users />} />
```

Replace with:
```tsx
<Route path='/users' element={
  <PermissionRoute required="USER_MANAGE" deny="403">
    <Users />
  </PermissionRoute>
} />
```

- [ ] **Step 3: Wrap the `/courses/add` route**

Find:
```tsx
<Route path='/courses/add' element={<CreateCourse />} />
```

Replace with:
```tsx
<Route path='/courses/add' element={
  <PermissionRoute required="COURSE_EDIT" deny="redirect">
    <CreateCourse />
  </PermissionRoute>
} />
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd ui && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add ui/src/App.tsx
git commit -m "feat: protect /users and /courses/add routes with PermissionRoute"
```

---

## Task 9: Frontend — Hide Users nav link

**Files:**
- Modify: `ui/src/layout/Nav.tsx`

- [ ] **Step 1: Add usePermission import and hide Users link**

In `Nav.tsx`, add the import:
```tsx
import { usePermission } from "@/hooks/usePermission";
```

At the top of the `Nav` component body, add:
```tsx
const canManageUsers = usePermission("USER_MANAGE");
```

Find the Users `NavLink` block:
```tsx
<NavLink
  to="/users"
  className={({ isActive }) =>
    cn(
      buttonVariants({ variant: "ghost", size: "sm" }),
      "text-sm transition-colors-fast",
      isActive && "bg-primary/10 text-primary font-medium"
    )
  }
>
  Users
</NavLink>
```

Wrap it:
```tsx
{canManageUsers && (
  <NavLink
    to="/users"
    className={({ isActive }) =>
      cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "text-sm transition-colors-fast",
        isActive && "bg-primary/10 text-primary font-medium"
      )
    }
  >
    Users
  </NavLink>
)}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd ui && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add ui/src/layout/Nav.tsx
git commit -m "feat: hide Users nav link without USER_MANAGE permission"
```

---

## Task 10: Frontend — Hide Add/Edit/Delete in Courses

**Files:**
- Modify: `ui/src/pages/courses/Courses.tsx`
- Modify: `ui/src/pages/courses/CourseCard.tsx`
- Modify: `ui/src/pages/courses/CourseInfo.tsx`

> Note: `CourseCard` currently has no Edit/Delete buttons — only a "View Course" button. Check `CourseInfo.tsx` for any edit/delete actions there. If neither has them, only update `Courses.tsx` for the Add button.

- [ ] **Step 1: Hide "Add Course" button in `Courses.tsx`**

Add import:
```tsx
import { usePermission } from "@/hooks/usePermission";
```

Inside the `Courses` component:
```tsx
const canEditCourses = usePermission("COURSE_EDIT");
```

Find the Add Course Button (around line 63):
```tsx
<Button onClick={() => navigate("/courses/add")} className="gap-2 whitespace-nowrap">
```

Wrap with:
```tsx
{canEditCourses && (
  <Button onClick={() => navigate("/courses/add")} className="gap-2 whitespace-nowrap">
    {/* existing button content */}
  </Button>
)}
```

- [ ] **Step 2: Check CourseInfo for edit/delete actions and guard them if present**

Read `CourseInfo.tsx` fully. If there is an Edit or Delete button, add:
```tsx
const canEditCourses = usePermission("COURSE_EDIT");
```
And wrap those buttons with `{canEditCourses && ...}`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd ui && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add ui/src/pages/courses/Courses.tsx ui/src/pages/courses/CourseCard.tsx ui/src/pages/courses/CourseInfo.tsx
git commit -m "feat: hide course edit actions without COURSE_EDIT permission"
```

---

## Task 11: Frontend — Hide Add/Edit/Delete in Authors

**Files:**
- Modify: `ui/src/pages/authors/Authors.tsx`
- Modify: `ui/src/pages/authors/AuthorItem.tsx`

- [ ] **Step 1: Hide "Add Author" button in `Authors.tsx`**

Add import:
```tsx
import { usePermission } from "@/hooks/usePermission";
```

Inside the `Authors` component:
```tsx
const canEditAuthors = usePermission("AUTHOR_EDIT");
```

Find the "Add Author" Button (the one calling `handleAddClick`):
```tsx
<Button ... onClick={handleAddClick} ...>
```

Wrap with:
```tsx
{canEditAuthors && (
  <Button ... onClick={handleAddClick} ...>
    {/* existing content */}
  </Button>
)}
```

- [ ] **Step 2: Hide Edit/Delete in `AuthorItem.tsx`**

Add import:
```tsx
import { usePermission } from "@/hooks/usePermission";
```

Inside the `AuthorItem` component:
```tsx
const canEditAuthors = usePermission("AUTHOR_EDIT");
```

Wrap the button group `<div className="flex gap-2 ml-3 flex-shrink-0">`:
```tsx
{canEditAuthors && (
  <div className="flex gap-2 ml-3 flex-shrink-0">
    {/* Edit and Delete buttons unchanged */}
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd ui && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add ui/src/pages/authors/Authors.tsx ui/src/pages/authors/AuthorItem.tsx
git commit -m "feat: hide author edit actions without AUTHOR_EDIT permission"
```

---

## Task 12: Frontend — Hide Add/Edit/Delete in Tags

**Files:**
- Modify: `ui/src/pages/tags/Tags.tsx`
- Modify: `ui/src/pages/tags/TagItem.tsx`

- [ ] **Step 1: Hide "Add Tag" button in `Tags.tsx`**

Add import:
```tsx
import { usePermission } from "@/hooks/usePermission";
```

Inside the `Tags` component:
```tsx
const canEditTags = usePermission("TAG_EDIT");
```

Find the Add Tag Button (the one opening the add modal):

Wrap it:
```tsx
{canEditTags && (
  <Button ...>
    {/* existing content */}
  </Button>
)}
```

- [ ] **Step 2: Hide Edit/Delete in `TagItem.tsx`**

Add import:
```tsx
import { usePermission } from "@/hooks/usePermission";
```

Inside the `TagItem` component:
```tsx
const canEditTags = usePermission("TAG_EDIT");
```

Wrap the button group:
```tsx
{canEditTags && (
  <div className="flex gap-2 ml-3 flex-shrink-0">
    {/* Edit and Delete buttons unchanged */}
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd ui && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add ui/src/pages/tags/Tags.tsx ui/src/pages/tags/TagItem.tsx
git commit -m "feat: hide tag edit actions without TAG_EDIT permission"
```

---

## Task 13: Frontend — Hide Add/Edit/Delete in Users

**Files:**
- Modify: `ui/src/pages/users/Users.tsx`
- Modify: `ui/src/pages/users/UserItem.tsx`

- [ ] **Step 1: Hide "Add User" button in `Users.tsx`**

Add import:
```tsx
import { usePermission } from "@/hooks/usePermission";
```

Inside the `Users` component:
```tsx
const canManageUsers = usePermission("USER_MANAGE");
```

Wrap the Add User Button:
```tsx
{canManageUsers && (
  <Button ...>
    {/* existing content */}
  </Button>
)}
```

- [ ] **Step 2: Hide Edit/Delete in `UserItem.tsx`**

Add import:
```tsx
import { usePermission } from "@/hooks/usePermission";
```

Inside the `UserItem` component:
```tsx
const canManageUsers = usePermission("USER_MANAGE");
```

Wrap the button group:
```tsx
{canManageUsers && (
  <div className="flex gap-2 ml-3 flex-shrink-0">
    {/* Edit and Delete buttons unchanged */}
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd ui && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add ui/src/pages/users/Users.tsx ui/src/pages/users/UserItem.tsx
git commit -m "feat: hide user management actions without USER_MANAGE permission"
```

---

## Task 14: Final verification

- [ ] **Step 1: Run all frontend tests**

```bash
cd ui && npm test
```

Expected: All tests pass, no regressions.

- [ ] **Step 2: Run ESLint**

```bash
cd ui && npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Run all backend tests**

```bash
./gradlew api:test
```

Expected: All tests pass.

- [ ] **Step 4: Manual smoke test**

1. Log in as `admin` / `admin123` (ROLE_ADMIN) — verify all buttons visible, `/users` accessible, `/courses/add` accessible.
2. Register a new user (will get ROLE_USER, only COURSE_VIEW) — verify:
   - No "Add Course" button
   - No Edit/Delete on CourseCard/AuthorItem/TagItem/UserItem
   - Users nav link hidden
   - Navigating to `/users` directly shows 403 page with countdown
   - Navigating to `/courses/add` directly redirects to `/courses`
