# E2E Testing Guide for course-app

Comprehensive guide for running, writing, and maintaining end-to-end (E2E) tests using Playwright.

## Quick Start

### Prerequisites
- Backend running on `http://localhost:8081`: `./gradlew api:bootRun`
- Frontend dev server on `http://localhost:3000`: `cd ui && npm run dev`
- Dependencies installed: `cd ui && npm install && npx playwright install --with-deps`

### Run All Tests
```bash
cd ui
npm run e2e
```

All 53 tests will execute in ~19 seconds.

## Running Tests

| Command | Purpose |
|---------|---------|
| `npm run e2e` | Run all 53 tests headless |
| `npm run e2e:ui` | Visual test runner with UI |
| `npm run e2e:debug` | Debug mode with Inspector |
| `npm run e2e:report` | View HTML report |

### Run Specific Tests
```bash
npx playwright test tests/e2e/auth.spec.ts  # Single file
npx playwright test -g "should log in"      # By name
npx playwright test --project=chromium      # Single browser
npx playwright test --headed                # See browser
```

## Test Coverage (53 Total Tests)

- **Authentication (9)**: Login, logout, token, protected routes
- **Courses (6)**: List, create, search, details
- **Authors (6)**: List, navigate, search
- **Tags (11)**: Create, manage, filter, search
- **Users (12)**: Manage, search, roles, permissions
- **Navigation (6)**: Menu, cross-page nav, mobile responsive

## Writing Tests

### Basic Template
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
    const element = page.locator('[data-testid="element"]');
    await expect(element).toBeVisible();
    await element.click();
    await expect(page).toHaveURL(/expected-url/);
  });
});
```

## Test Fixtures (ui/tests/fixtures/auth.fixture.ts)

- `loginUser(page, username?, password?)` - Log in user
- `logoutUser(page)` - Log out and clear session
- `clearAppState(page)` - Clear localStorage/sessionStorage
- `isLoggedIn(page)` - Check authentication status

## Best Practices

### DO Use
- Explicit waits: `await page.waitForLoadState('networkidle')`
- Flexible selectors: `[data-testid="element"]`
- Locators for reusability: `page.locator('[data-testid="id"]')`
- Handle optional elements: `.catch(() => false)`

### DON'T Use
- Hardcoded waits: `await page.waitForTimeout(2000)`
- Brittle selectors: `div > div > button`
- Ignoring async operations
- DOM structure dependencies

## Debugging

```bash
npm run e2e:ui              # Visual mode
npm run e2e:debug           # Inspector mode
npm run e2e:report          # HTML report
npx playwright test --headed # See browser
```

## CI/CD Integration

Tests run automatically in:
- **GitHub Actions**: All 3 browsers
- **GitLab CI**: `ui-e2e-test` job

## Common Issues

| Issue | Solution |
|-------|----------|
| Tests pass locally, fail in CI | Use waitForLoadState(), check API |
| Element not found | Add data-testid, use waitForSelector() |
| Timed out URL | Increase timeout, verify navigation |
| Flaky tests | Use explicit waits, ensure isolation |

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Test Files README](ui/tests/README.md)
- [data-testid Guide](ui/DATA_TESTID_GUIDE.md)
- [Debugging](https://playwright.dev/docs/debug)
- [Best Practices](https://playwright.dev/docs/best-practices)

---

**Status**: ✅ All 53 tests passing
**Execution Time**: ~19 seconds
**Coverage**: Authentication, Courses, Authors, Tags, Users, Navigation
