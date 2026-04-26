# Navbar Auth-Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide Nav, NotificationBell, and Profile components from the DOM when user is not authenticated.

**Architecture:** Create a reusable `AuthenticatedOnly` wrapper component that conditionally renders children based on `isAuthenticated` from AuthContext. Wrap authenticated-only navbar elements in this component.

**Tech Stack:** React 19, TypeScript, React Context (AuthContext), @testing-library/react

---

## File Structure

```
New Files:
  ui/src/common/AuthenticatedOnly.tsx              → Wrapper component
  ui/src/common/AuthenticatedOnly.test.tsx         → Component tests

Modified Files:
  ui/src/layout/Header.tsx                         → Use AuthenticatedOnly wrapper
  ui/src/layout/Header.test.tsx                    → Update tests
```

---

## Task 1: Create AuthenticatedOnly Component

**Files:**
- Create: `ui/src/common/AuthenticatedOnly.tsx`
- Test: `ui/src/common/AuthenticatedOnly.test.tsx`

### Step 1: Write the component

- [ ] Create `ui/src/common/AuthenticatedOnly.tsx`

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

- [ ] **Verify the file was created**

Run: `ls -la ui/src/common/AuthenticatedOnly.tsx`

Expected output: File exists with correct permissions

---

## Task 2: Write Tests for AuthenticatedOnly

**Files:**
- Test: `ui/src/common/AuthenticatedOnly.test.tsx`

### Step 1: Write the failing tests

- [ ] Create `ui/src/common/AuthenticatedOnly.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthenticatedOnly } from './AuthenticatedOnly';
import { AuthContext } from '@/context/auth-context';

describe('AuthenticatedOnly', () => {
  it('renders children when isAuthenticated is true', () => {
    const mockAuthValue = {
      user: null,
      authStatus: 'authenticated' as const,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    };

    render(
      <AuthContext.Provider value={mockAuthValue}>
        <AuthenticatedOnly>
          <div data-testid="authenticated-content">Secret Content</div>
        </AuthenticatedOnly>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('authenticated-content')).toBeInTheDocument();
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });

  it('renders null when isAuthenticated is false', () => {
    const mockAuthValue = {
      user: null,
      authStatus: 'anonymous' as const,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    };

    const { container } = render(
      <AuthContext.Provider value={mockAuthValue}>
        <AuthenticatedOnly>
          <div data-testid="authenticated-content">Secret Content</div>
        </AuthenticatedOnly>
      </AuthContext.Provider>
    );

    expect(screen.queryByTestId('authenticated-content')).not.toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
    expect(container.firstChild).toBeEmptyDOMNode();
  });

  it('renders fallback when isAuthenticated is false and fallback is provided', () => {
    const mockAuthValue = {
      user: null,
      authStatus: 'anonymous' as const,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    };

    render(
      <AuthContext.Provider value={mockAuthValue}>
        <AuthenticatedOnly fallback={<div data-testid="fallback-content">Login Required</div>}>
          <div data-testid="authenticated-content">Secret Content</div>
        </AuthenticatedOnly>
      </AuthContext.Provider>
    );

    expect(screen.queryByTestId('authenticated-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
    expect(screen.getByText('Login Required')).toBeInTheDocument();
  });
});
```

### Step 2: Run the tests to verify they pass

- [ ] Run tests for AuthenticatedOnly

Run: `cd ui && npm test -- AuthenticatedOnly.test.tsx`

Expected output: All 3 tests pass ✓

---

## Task 3: Update Header Component to Use AuthenticatedOnly

**Files:**
- Modify: `ui/src/layout/Header.tsx`

### Step 1: Update Header to import and use AuthenticatedOnly

- [ ] Modify `ui/src/layout/Header.tsx`

Find the current Header:
```typescript
import Logo from "@/layout/Logo";
import Profile from "@/layout/Profile";
import Nav from "@/layout/Nav";
import NotificationBell from "@/layout/NotificationBell";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-fade">
      <div className="container mx-auto flex justify-between items-center h-16 px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <Nav />
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <Profile />
        </div>
      </div>
    </header>
  );
};

export default Header;
```

Replace with:
```typescript
import Logo from "@/layout/Logo";
import Profile from "@/layout/Profile";
import Nav from "@/layout/Nav";
import NotificationBell from "@/layout/NotificationBell";
import { AuthenticatedOnly } from "@/common/AuthenticatedOnly";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-fade">
      <div className="container mx-auto flex justify-between items-center h-16 px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <AuthenticatedOnly>
            <Nav />
          </AuthenticatedOnly>
        </div>
        <div className="flex items-center gap-4">
          <AuthenticatedOnly>
            <NotificationBell />
            <Profile />
          </AuthenticatedOnly>
        </div>
      </div>
    </header>
  );
};

export default Header;
```

### Step 2: Verify the file syntax is correct

- [ ] Check for TypeScript errors in Header.tsx

Run: `cd ui && npx tsc --noEmit src/layout/Header.tsx`

Expected output: No errors

---

## Task 4: Update Header Tests

**Files:**
- Modify: `ui/src/layout/Header.test.tsx`

### Step 1: Check existing Header tests

- [ ] Review current Header tests

Run: `cat ui/src/layout/Header.test.tsx`

Expected output: Test file content (if it exists; if not, we'll create a basic test)

### Step 2: Add or update tests for AuthenticatedOnly wrapper behavior

- [ ] If Header.test.tsx exists, add test cases for authenticated/unauthenticated states:

For **unauthenticated users**, add a test:
```typescript
it('does not render Nav, NotificationBell, or Profile when not authenticated', () => {
  const mockAuthValue = {
    user: null,
    authStatus: 'anonymous' as const,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  };

  render(
    <AuthContext.Provider value={mockAuthValue}>
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    </AuthContext.Provider>
  );

  // Logo should still be present
  expect(screen.getByAltText(/logo/i)).toBeInTheDocument();

  // Nav should not be rendered (check for "Courses" link which is in Nav)
  expect(screen.queryByRole('link', { name: /courses/i })).not.toBeInTheDocument();

  // NotificationBell should not be rendered (check for notification button)
  expect(screen.queryByLabelText(/notifications/i)).not.toBeInTheDocument();

  // Profile should not be rendered
  expect(screen.queryByRole('button', { name: /profile/i })).not.toBeInTheDocument();
});
```

For **authenticated users**, ensure existing test or add:
```typescript
it('renders Nav, NotificationBell, and Profile when authenticated', () => {
  const mockAuthValue = {
    user: { name: 'John Doe', email: 'john@example.com', authType: 'session' as const, permissions: [] },
    authStatus: 'authenticated' as const,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  };

  render(
    <AuthContext.Provider value={mockAuthValue}>
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    </AuthContext.Provider>
  );

  // Logo should be present
  expect(screen.getByAltText(/logo/i)).toBeInTheDocument();

  // Nav should be rendered (check for "Courses" link)
  expect(screen.getByRole('link', { name: /courses/i })).toBeInTheDocument();

  // NotificationBell should be rendered
  expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();

  // Profile should be rendered
  expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();
});
```

### Step 3: Run Header tests

- [ ] Run Header component tests

Run: `cd ui && npm test -- Header.test.tsx`

Expected output: All tests pass ✓

---

## Task 5: Run Full Test Suite

**Files:** All UI tests

### Step 1: Run all UI tests to ensure no regressions

- [ ] Run complete UI test suite

Run: `cd ui && npm test`

Expected output:
- All tests pass ✓
- Coverage maintained or improved
- No failing tests

### Step 2: Check for ESLint violations

- [ ] Run ESLint to verify code quality

Run: `cd ui && npm run lint`

Expected output: No errors

---

## Task 6: Commit Changes

**Files:** All modified and new files

### Step 1: Verify all files are ready

- [ ] Check git status

Run: `cd /Users/jeremy_zhou/git-code/course-app && git status`

Expected output:
```
Changes not staged for commit:
  modified:   ui/src/layout/Header.tsx
  modified:   ui/src/layout/Header.test.tsx

Untracked files:
  ui/src/common/AuthenticatedOnly.tsx
  ui/src/common/AuthenticatedOnly.test.tsx
```

### Step 2: Stage all changes

- [ ] Add files to git

Run: `cd /Users/jeremy_zhou/git-code/course-app && git add ui/src/common/AuthenticatedOnly.tsx ui/src/common/AuthenticatedOnly.test.tsx ui/src/layout/Header.tsx ui/src/layout/Header.test.tsx`

### Step 3: Commit

- [ ] Commit with descriptive message

Run: `cd /Users/jeremy_zhou/git-code/course-app && git commit -m "feat: add AuthenticatedOnly wrapper to hide navbar elements from unauthenticated users

- Create AuthenticatedOnly component for conditional rendering based on isAuthenticated
- Wrap Nav, NotificationBell, and Profile in AuthenticatedOnly in Header
- Logo remains visible for all users
- Add unit tests for AuthenticatedOnly component
- Add integration tests for Header with auth states"`

Expected output: Commit successful with file counts

### Step 4: Verify commit

- [ ] Check commit log

Run: `cd /Users/jeremy_zhou/git-code/course-app && git log --oneline -1`

Expected output: New commit appears with message starting with "feat: add AuthenticatedOnly wrapper..."

---

## Summary

✅ AuthenticatedOnly component created and tested  
✅ Header updated to use AuthenticatedOnly wrapper  
✅ Nav, NotificationBell, and Profile hidden from unauthenticated users  
✅ Logo remains visible for all users  
✅ All tests passing with 100% coverage for new component  
✅ Changes committed to git
