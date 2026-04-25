# Granular UI Access Control — Design Spec

**Date:** 2026-04-25  
**Status:** Approved

---

## Problem Statement

Currently, all authenticated users see the same UI regardless of their role. Users with only `COURSE_VIEW` permission can see Add/Edit/Delete buttons across all domains (Courses, Authors, Tags, Users) and can navigate to write-access routes. The backend correctly rejects unauthorized API calls, but the UI provides no feedback and does not hide inaccessible actions, creating a confusing user experience.

---

## Goals

- Hide action buttons (Add, Edit, Delete) from users who lack the required permission for a given domain.
- Block access to restricted routes with a clear 403 Access Denied page (with auto-redirect).
- Silently block routes where even displaying a 403 would be confusing (e.g., `/courses/add`).
- Hide nav links for domains the user cannot access.
- Require no extra API calls beyond the existing session init (`/api/auth/me`).

---

## Permission Model

### New Permissions

Two new domain-specific permissions are added, replacing the overloaded `COURSE_EDIT` for non-course domains:

| Permission | Domain | Guards |
|---|---|---|
| `COURSE_VIEW` | Courses | View course list and detail (existing) |
| `COURSE_EDIT` | Courses | Add / Edit / Delete courses, access `/courses/add` |
| `AUTHOR_EDIT` | Authors | Add / Edit / Delete authors |
| `TAG_EDIT` | Tags | Add / Edit / Delete tags |
| `USER_MANAGE` | Users | View users page, Add / Edit / Delete users |
| `ROLE_MANAGE` | Roles | Role assignment (existing, reserved for future use) |

### Role → Permission Mapping

| Role | Permissions |
|---|---|
| `ROLE_USER` | `COURSE_VIEW` |
| `ROLE_ADMIN` | All 6 permissions |

---

## Backend Changes

### Flyway Migration (V{N}__add_author_tag_permissions.sql)

- Insert `AUTHOR_EDIT` and `TAG_EDIT` into the `permission` table.
- Assign both to `ROLE_ADMIN` via `role_permissions`.
- `ROLE_USER` is unchanged (keeps only `COURSE_VIEW`).

### Extended `/api/auth/me` Response

The existing endpoint is extended to include the authenticated user's permissions, derived from their `GrantedAuthority` list in the `Authentication` principal.

**Before:**
```json
{
  "name": "admin",
  "email": "admin@email.com",
  "provider": "legacy",
  "authType": "session"
}
```

**After:**
```json
{
  "name": "admin",
  "email": "admin@email.com",
  "provider": "legacy",
  "authType": "session",
  "permissions": ["COURSE_VIEW", "COURSE_EDIT", "AUTHOR_EDIT", "TAG_EDIT", "USER_MANAGE", "ROLE_MANAGE"]
}
```

No new endpoints or schema changes are required — only the migration file and the `AuthController.me()` response body.

---

## Frontend Changes

### Data Flow

```
/api/auth/me (on session init)
  └─ AuthContext stores: user { name, email, permissions[] }
       └─ usePermission("COURSE_EDIT") → boolean
            └─ consumed by components and PermissionRoute
```

### Types

`AuthenticatedUser` in `auth-context.ts` gains:
```ts
permissions: string[]
```

`CurrentUserResponse` in `authApi.ts` gains:
```ts
permissions: string[]
```

### `usePermission` Hook

New hook in `ui/src/hooks/usePermission.ts`:
```ts
// Returns true if the current user has the given permission
function usePermission(permission: string): boolean
```
Reads `user.permissions` from `AuthContext`. Returns `false` if user is not authenticated.

### `PermissionRoute` Component

New component in `ui/src/router/PermissionRoute.tsx`.

Two modes:
- **`deny="403"`** — renders `<AccessDenied />` page if user lacks the permission.
- **`deny="redirect"`** — silently redirects to `/courses` if user lacks the permission (no 403 page).

Usage in `App.tsx`:
```tsx
<Route path="/users" element={
  <PermissionRoute required="USER_MANAGE" deny="403">
    <Users />
  </PermissionRoute>
} />

<Route path="/courses/add" element={
  <PermissionRoute required="COURSE_EDIT" deny="redirect">
    <CreateCourse />
  </PermissionRoute>
} />
```

### `AccessDenied` Page

New component at `ui/src/common/AccessDenied.tsx`.

- Displays "403 — Access Denied" heading.
- Explains the user does not have permission to view this page.
- Shows a countdown (5 seconds) and auto-redirects to `/courses`.
- Includes a "Go to Courses" link for immediate navigation.

### Conditional Button/Action Rendering

Each page uses `usePermission()` to conditionally render write actions:

| Page / Component | Button / Action hidden | Permission required |
|---|---|---|
| `Courses.tsx` | "Add Course" button | `COURSE_EDIT` |
| `CourseCard.tsx` / `CourseInfo.tsx` | Edit, Delete | `COURSE_EDIT` |
| `Authors.tsx` | "Add Author" button | `AUTHOR_EDIT` |
| `AuthorItem.tsx` | Edit, Delete | `AUTHOR_EDIT` |
| `Tags.tsx` | "Add Tag" button | `TAG_EDIT` |
| `TagItem.tsx` | Edit, Delete | `TAG_EDIT` |
| `Users.tsx` | "Add User" button | `USER_MANAGE` |
| `UserItem.tsx` | Edit, Delete | `USER_MANAGE` |

### Nav Link Hiding

In `Header` / nav component: the "Users" link is hidden when `usePermission("USER_MANAGE")` returns `false`.

---

## Error Handling

- If `/api/auth/me` returns no `permissions` field (e.g. legacy token or partial response), `permissions` defaults to `[]` — user sees read-only UI. No crash.
- The `usePermission` hook returns `false` during `authStatus === "loading"` to prevent flash of unauthorized actions.

---

## Testing

### Backend
- Unit test: `me()` endpoint returns `permissions` array for session-authenticated user.
- Unit test: `me()` endpoint returns `permissions` array for JWT-authenticated user.
- Migration test: `AUTHOR_EDIT` and `TAG_EDIT` exist in permission table and are assigned to `ROLE_ADMIN`.

### Frontend
- `usePermission` hook: returns `true` when permission present, `false` when absent, `false` when unauthenticated.
- `PermissionRoute` with `deny="403"`: renders `AccessDenied` when permission missing.
- `PermissionRoute` with `deny="redirect"`: redirects to `/courses` when permission missing.
- `AccessDenied`: renders countdown, triggers navigation after 5 seconds.
- Page-level: action buttons hidden when permission absent, visible when present.

---

## Out of Scope

- `ROLE_MANAGE` UI — no role assignment UI is built in this feature.
- Per-resource ownership checks (e.g., "only author of a course can edit it").
- Refresh of permissions mid-session — a page refresh is sufficient.
