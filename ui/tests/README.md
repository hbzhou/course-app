# E2E Tests Directory

Contains end-to-end tests using [Playwright v1.48.0](https://playwright.dev/) with 53 comprehensive tests covering all major workflows.

## Overview

- **Total Tests**: 53
- **Status**: ✅ All passing
- **Execution Time**: ~19 seconds
- **Framework**: Playwright v1.48.0

## Directory Structure

```
tests/
├── e2e/                      # End-to-end test specifications
│   ├── auth.spec.ts          # Authentication flows (9 tests)
│   ├── courses.spec.ts       # Courses functionality (6 tests)
│   ├── authors.spec.ts       # Authors management (6 tests)
│   ├── tags.spec.ts          # Tags management (11 tests)
│   ├── users.spec.ts         # User management (12 tests)
│   └── navigation.spec.ts    # Navigation & layout (6 tests)
├── fixtures/                 # Reusable test utilities
│   └── auth.fixture.ts       # Authentication helpers
└── README.md                 # This file
```

## Test Coverage

| Category | Tests | Key Scenarios |
|----------|-------|---------------|
| **Authentication** | 9 | Login, logout, registration, token persistence, protected routes |
| **Courses** | 6 | Listing, creation, search, details, responsive layout |
| **Authors** | 6 | Listing, navigation, search, responsive design |
| **Tags** | 11 | Management, creation, filtering, search, operations |
| **Users** | 12 | Management, search, roles, permissions, status |
| **Navigation** | 6 | Navigation, menu, header, mobile responsive |

## Test Fixtures

Reusable helper functions in `fixtures/auth.fixture.ts`:

### `loginUser(page, username?, password?): Promise<void>`
Log in a user with optional custom credentials.
```typescript
await loginUser(page);                    // Default: admin/admin123
await loginUser(page, 'john', 'pass123'); // Custom credentials
```

### `logoutUser(page): Promise<void>`
Log out the current user and clear session.
```typescript
await logoutUser(page);
```

### `clearAppState(page): Promise<void>`
Clear localStorage and sessionStorage before tests.
```typescript
await clearAppState(page);  // Always use in beforeEach
```

### `isLoggedIn(page): Promise<boolean>`
Check if user is currently authenticated.
```typescript
const loggedIn = await isLoggedIn(page);
```

## Running Tests

**See [ui/README.md](../README.md) for detailed instructions:**

```bash
cd ui
npm run e2e              # Run all tests
npm run e2e:ui           # Visual test runner
npm run e2e:debug        # Debug mode
npm run e2e:report       # View HTML report
```

## Writing Tests

Use the `/e2e/*.spec.ts` files as templates and keep test setup in `beforeEach` with `clearAppState()` + `loginUser()`.

```typescript
import { test, expect } from '@playwright/test';
import { loginUser, clearAppState } from '../fixtures/auth.fixture';

test.describe('Feature', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page);
    await loginUser(page);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/page');
    const element = page.locator('[data-testid="item"]');
    await expect(element).toBeVisible();
  });
});
```

## Documentation

- [ui/README.md](../README.md) — How to run tests and debugging
- [Playwright Docs](https://playwright.dev/) — Official documentation
