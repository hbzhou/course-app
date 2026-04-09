# Playwright E2E Testing Setup & Guide

Complete end-to-end testing setup with Playwright v1.48.0 covering the entire course-app application.

## Current Status

✅ **All 53 E2E tests passing**
- 9 Authentication tests
- 6 Courses management tests
- 6 Authors management tests  
- 11 Tags management tests
- 12 User management tests
- 6 Navigation & layout tests

**Execution Time**: ~19 seconds | **Coverage**: All major user workflows

## What Was Set Up

### 1. **Playwright Configuration** (`ui/playwright.config.ts`)
- Configured for Chrome, Firefox, and WebKit browsers
- Base URL: `http://localhost:3000` (can be overridden via `BASE_URL` env var)
- Timeouts: 30 seconds per test, 5 seconds for assertions
- Screenshots and videos captured on failure
- HTML and JUnit XML reports generated
- Automatic dev server startup for local testing

### 2. **Test Fixtures** (`ui/tests/fixtures/auth.fixture.ts`)
Helper functions for common test scenarios:
- `loginUser()` - Log in with credentials, returns JWT token
- `logoutUser()` - Log out and verify session cleared
- `isLoggedIn()` - Check if user is authenticated
- `clearAppState()` - Reset localStorage/sessionStorage
- `waitForApiCall()` - Wait for specific API calls

### 3. **Test Files** (`ui/tests/e2e/`)

#### `auth.spec.ts` - Authentication Tests
- Login form rendering
- Invalid credential handling
- Successful login flow
- Registration link visibility
- Protected route access
- Token persistence in localStorage
- Session management

#### `courses.spec.ts` - Courses Page Tests
- Courses list display
- Create course button
- Course navigation
- Search/filter functionality
- Course details view
- Responsive layout

#### `authors.spec.ts` - Authors Page Tests
- Authors list display
- Page navigation
- Author entries
- Search functionality
- Responsive design

#### `navigation.spec.ts` - Navigation Tests
- Cross-page navigation
- Menu display
- Navigation links
- Header/profile elements
- Mobile responsive design (iPhone 12 test)

### 4. **npm Scripts** (added to `ui/package.json`)
```bash
npm run e2e              # Run all tests headless
npm run e2e:debug       # Run with Inspector for debugging
npm run e2e:ui          # Run with visual test runner
npm run e2e:report      # View HTML test report
```

### 5. **CI/CD Integration**

#### GitLab CI (`ui/.gitlab-ci.yml`)
- **Job**: `ui-e2e-test`
- **Image**: Playwright v1.48.0 (jammy)
- **Stage**: test
- **Artifacts**: HTML report, JUnit XML, screenshots, videos
- **Retries**: 1 retry on script failure
- **Reports**: JUnit XML for CI integration

#### GitHub Actions (`.github/workflows/ui-ci.yml`)
Comprehensive pipeline with:
- **Lint Step**: ESLint validation
- **Unit Tests**: Vitest with coverage reporting
- **Build Step**: Vite production build
- **E2E Tests**: Parallel Playwright tests (chromium, firefox, webkit)
- **Artifacts**: Test results, reports, videos
- **Coverage**: Codecov integration

## Key Features

### 1. **Modern Test Infrastructure**
- Supports multiple browsers (Chromium, Firefox, WebKit)
- Automatic dev server management
- Built-in screenshots and videos on failure
- HTML and JUnit XML reporting

### 2. **Flexible Execution**
- Local development: `npm run e2e`
- Debug mode: `npm run e2e:debug` (Playwright Inspector)
- UI mode: `npm run e2e:ui` (visual test runner)
- CI mode: Headless with automatic reporting

### 3. **Authentication Handling**
Fixture-based helpers for consistent auth testing across all test files.

### 4. **Realistic User Interactions**
- Login/logout flows
- Form filling and submission
- Navigation between pages
- Mobile device testing

### 5. **Production-Ready Reporting**
- Screenshots of failures
- Video recordings of failed tests
- HTML interactive report
- JUnit XML for CI integration
- Artifacts stored in CI for analysis

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Install Playwright
```bash
cd ui
npm install
npx playwright install --with-deps
```

### Run Tests Locally
```bash
# Run all tests
npm run e2e

# Run with debug inspector
npm run e2e:debug

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run specific test
npx playwright test tests/e2e/auth.spec.ts -g "should log in"

# Run for specific browser
npx playwright test --project=chromium

# Run in headed mode (see browser)
npx playwright test --headed

# View HTML report
npm run e2e:report
```

## CI Integration Details

### GitLab CI
Tests run in the `test` stage after compilation:
```bash
# In CI environment
cd ui
npm install
npx playwright install --with-deps
npm run e2e
```

**Results Location**: Artifacts → "E2E Test Report"

### GitHub Actions
Three test jobs run in parallel:
1. **ui-lint**: ESLint validation
2. **ui-unit-tests**: Vitest coverage
3. **ui-e2e-tests**: Playwright in 3 browsers

Tests run on each push to `main` or feature branches (`phase*-*`) when UI files change.

**Results**: Check under "Artifacts" for:
- `e2e-test-results-{browser}` - JUnit XML and screenshots
- `playwright-report-{browser}` - Interactive HTML report
- `unit-test-results` - Unit test artifacts

## Writing New Tests

### 1. Create Test File
```typescript
// tests/e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { loginUser, clearAppState } from '../fixtures/auth.fixture';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page);
    await loginUser(page);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/my-page');
    // ... test assertions
  });
});
```

### 2. Add data-testid to Components
```jsx
// React component
<button data-testid="submit-btn">Submit</button>
<div data-testid="user-profile">
  {/* content */}
</div>
```

### 3. Use Fixtures in Tests
```typescript
// Login before accessing protected pages
await loginUser(page);

// Wait for API calls
await waitForApiCall(page, '/api/courses', async () => {
  await page.click('[data-testid="fetch-btn"]');
});

// Clean up state
await logoutUser(page);
```

### 4. Run and Debug
```bash
# Run new test
npx playwright test tests/e2e/my-feature.spec.ts

# Debug new test
npm run e2e:debug -- tests/e2e/my-feature.spec.ts

# View interactive report
npm run e2e:report
```

## Best Practices

### Selectors
✅ Use `data-testid` for reliable test selectors
```typescript
page.locator('[data-testid="submit-btn"]')
```

❌ Avoid relying on DOM structure
```typescript
// Don't do this
page.locator('div > div > button')
```

### Waits
✅ Use explicit waits for async operations
```typescript
await page.waitForLoadState('networkidle');
await page.waitForURL('**/courses', { timeout: 5000 });
```

❌ Avoid hardcoded timeouts
```typescript
// Don't do this
await page.waitForTimeout(2000);
```

### Assertions
✅ Use appropriate assertions
```typescript
await expect(element).toBeVisible();
expect(page.url()).toContain('/courses');
```

### Error Handling
✅ Handle optional elements gracefully
```typescript
const element = page.locator('[data-testid="optional"]');
if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
  await element.click();
}
```

## Troubleshooting

### Tests Fail in CI but Pass Locally
- Check for dynamic timeouts: Use `waitForLoadState('networkidle')`
- Verify API endpoints are mocked or reachable in CI
- Check for browser-specific issues: Run with all three browsers

### Slow Tests in CI
- Reduce test scope: Test specific user journeys, not all edge cases
- Parallelize: Tests run in parallel by default
- Check for network issues: Use `waitForResponse()` for API verification

### Element Not Found
- Add `data-testid` to React components
- Use `waitForSelector()` for dynamically loaded content
- Check viewport size: Add `--headed` to see what test sees

### Authentication Issues
- Verify test user credentials (`TEST_USER` in fixture)
- Check that JWT token is properly stored in localStorage
- Use `clearAppState()` in `beforeEach()` to reset state

## Performance Optimization

### Parallel Execution
Tests run in parallel by default (3 browsers × N test files).

### Caching
- npm dependencies cached per branch
- Playwright browsers cached in image

### Resource Usage
- Single worker in CI (edit `playwright.config.ts` to change)
- Headless mode reduces resource consumption

## Maintenance

### Update Playwright
```bash
cd ui
npm update @playwright/test
npx playwright install --with-deps
```

### Update Test Data
- Modify `TEST_USER` in `tests/fixtures/auth.fixture.ts`
- Update selectors if component structure changes
- Adjust timeouts if application is slower

### Monitor Test Health
- Review CI logs for flaky tests
- Check artifact reports for patterns
- Fix failing tests promptly before they become pervasive

## Documentation

- [Playwright Official Docs](https://playwright.dev/)
- [Test Fixtures Guide](ui/tests/README.md)
- [Playwright API Reference](https://playwright.dev/docs/api/class-page)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Support

For questions or issues:
1. Check [ui/tests/README.md](ui/tests/README.md) for detailed test docs
2. Review existing test files for patterns
3. Run tests with `--headed` to see what's happening
4. Use `npm run e2e:debug` for step-by-step debugging
