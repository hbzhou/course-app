# Navbar Authentication Gating — Design Spec

**Date:** 2026-04-26  
**Status:** Approved  
**Goal:** Hide Nav, NotificationBell, and Profile components from unauthenticated users

---

## Problem Statement

Currently, the navbar displays navigation menus (Courses, Authors, Tags, Users) and a notification bell to all users, including those who are not logged in. This creates a confusing UX where unauthenticated users see interactive elements they cannot use until they authenticate.

**Requirement:** Hide these elements completely from the DOM when the user is not authenticated, while keeping the Logo visible as a branding anchor.

---

## Solution Overview

Implement a reusable `AuthenticatedOnly` wrapper component that conditionally renders its children based on the `isAuthenticated` flag from AuthContext. This component will wrap the conditional navbar elements in the Header, allowing clean, maintainable auth-gating.

---

## Architecture

### Component Structure

```
Header
  ├── Logo (always visible)
  └── AuthenticatedOnly
      ├── Nav (hidden if not authenticated)
      ├── NotificationBell (hidden if not authenticated)
      └── Profile (hidden if not authenticated)
```

### New Component: `AuthenticatedOnly`

**File:** `ui/src/common/AuthenticatedOnly.tsx`

**Responsibility:** Conditionally render children based on authentication status

**Props:**
- `children: ReactNode` — content to render when authenticated
- `fallback?: ReactNode` (optional) — content to render when not authenticated (defaults to `null`)

**Implementation:**
```typescript
import { ReactNode } from 'react';
import { useAuthContext } from '@/context/auth-context';

interface AuthenticatedOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AuthenticatedOnly = ({ children, fallback = null }: AuthenticatedOnlyProps) => {
  const { isAuthenticated } = useAuthContext();
  
  return isAuthenticated ? children : fallback;
};

export default AuthenticatedOnly;
```

**Why this approach:**
- Single responsibility: one component, one job (conditional rendering)
- Reusable: can wrap any components that should be auth-gated
- Testable: simple pure component with clear inputs/outputs
- Extensible: `fallback` prop allows future customization

### Header Changes

**File:** `ui/src/layout/Header.tsx`

**Current Structure:**
```tsx
<header>
  <div className="flex justify-between">
    <div className="flex gap-6">
      <Logo />
      <Nav />
    </div>
    <div className="flex gap-4">
      <NotificationBell />
      <Profile />
    </div>
  </div>
</header>
```

**New Structure:**
```tsx
<header>
  <div className="flex justify-between">
    <div className="flex gap-6">
      <Logo />
      <AuthenticatedOnly>
        <Nav />
      </AuthenticatedOnly>
    </div>
    <div className="flex gap-4">
      <AuthenticatedOnly>
        <NotificationBell />
        <Profile />
      </AuthenticatedOnly>
    </div>
  </div>
</header>
```

**Rationale:**
- Grouping NotificationBell and Profile together in one AuthenticatedOnly makes sense since they're both user-specific features
- Nav is wrapped separately for clarity, though could be combined (preference: separate for logical organization)
- Logo remains unwrapped and always visible

---

## Data Flow

1. **App Initialization:** AuthProvider loads auth state on mount
2. **AuthContext Updates:** `isAuthenticated` is set based on whether a valid session exists
3. **Header Renders:** Header reads `isAuthenticated` via `useAuthContext()` in AuthenticatedOnly
4. **Conditional Rendering:**
   - **Authenticated:** Nav, NotificationBell, Profile render and are added to DOM
   - **Not Authenticated:** All three return `null`, removed from DOM completely

---

## Implementation Tasks

1. Create `AuthenticatedOnly.tsx` component
2. Update `Header.tsx` to import and use AuthenticatedOnly
3. Write unit tests for AuthenticatedOnly
4. Update Header snapshot/integration tests

---

## Testing Strategy

### Unit Test: `AuthenticatedOnly.test.tsx`
- Test 1: Renders children when `isAuthenticated === true`
- Test 2: Renders null when `isAuthenticated === false`
- Test 3: Renders fallback when `isAuthenticated === false` and fallback is provided

### Integration Test: `Header.test.tsx`
- Test 1: Verify Nav, NotificationBell, Profile render when authenticated
- Test 2: Verify Nav, NotificationBell, Profile do NOT render when not authenticated
- Test 3: Verify Logo always renders regardless of auth status

---

## Success Criteria

✅ Unauthenticated users do NOT see Nav, NotificationBell, or Profile in the DOM  
✅ Authenticated users see all three components rendered normally  
✅ Logo is always visible  
✅ AuthenticatedOnly is reusable for other auth-gated features  
✅ Tests pass with 100% coverage for AuthenticatedOnly  

---

## No Breaking Changes

- No existing component interfaces change
- AuthContext already provides `isAuthenticated`
- Header layout remains responsive and functional
- All auth flows (JWT, OAuth2) work without modification
