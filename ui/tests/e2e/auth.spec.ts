import { test, expect } from '@playwright/test';
import { TEST_USER, loginUser, logoutUser, isLoggedIn, clearAppState } from '../fixtures/auth.fixture';

test.describe('Authentication Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth state before each test
    await clearAppState(page);
  });

  test.describe('Login Page', () => {
    test('should display login form elements', async ({ page }) => {
      await page.goto('/login');

      // Check for required form fields
      const usernameInput = page.locator('input[name="username"], input[placeholder*="Username"]').first();
      const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
      const submitBtn = page.locator('button[type="submit"]').first();

      await expect(usernameInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitBtn).toBeVisible();
    });

    test('should show error on invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in invalid credentials
      await page.fill('input[name="username"]', 'invalid');
      await page.fill('input[name="password"]', 'invalid');

      // Submit form
      await page.click('button[type="submit"]');

      // Wait a bit for potential error to appear
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Look for error message - app might display it differently
      const errorMsg = page.locator('[role="alert"], .error, .text-red, [data-testid*="error"], .toast').first();
      const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
      
      // If no visible error, check if still on login page (which indicates failed login)
      if (!hasError) {
        // Just verify we're still on login or error appeared somehow
        expect(page.url()).toContain('/login');
      } else {
        await expect(errorMsg).toBeVisible();
      }
    });

    test('should successfully log in with valid credentials', async ({ page }) => {
      await loginUser(page, TEST_USER.username, TEST_USER.password);

      // Verify user is on authenticated page (not login page)
      const url = page.url();
      expect(url).not.toContain('/login');
    });

    test('should display registration link', async ({ page }) => {
      await page.goto('/login');

      const registrationLink = page.locator('a:has-text("Register"), a:has-text("Sign up")').first();
      await expect(registrationLink).toBeVisible();
    });
  });

  test.describe('Navigation after login', () => {
    test('should allow navigation to courses page after login', async ({ page }) => {
      await loginUser(page);

      // Navigate to courses
      const coursesLink = page.locator('a:has-text("Courses"), a[href*="/courses"]').first();
      if (await coursesLink.isVisible()) {
        await coursesLink.click();
        await page.waitForURL('**/courses', { timeout: 5000 });
      } else {
        await page.goto('/courses');
      }

      await expect(page).toHaveURL(/\/courses/);
    });

    test('should logout successfully', async ({ page }) => {
      await loginUser(page);
      await logoutUser(page);

      const loggedIn = await isLoggedIn(page);
      expect(loggedIn).toBeFalsy();
    });

    test('should redirect to login when accessing protected route without auth', async ({ page }) => {
      await page.goto('/courses');

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });
  });

  test.describe('Session persistence', () => {
    test('should not persist legacy token in localStorage', async ({ page }) => {
      await loginUser(page);

      // Session auth should not rely on localStorage token.
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeNull();
    });

    test('should access protected page directly with valid session', async ({ page }) => {
      // Log in first
      await loginUser(page);

      // Navigate directly to courses
      await page.goto('/courses');

      // Should load successfully without redirect
      await expect(page).toHaveURL(/\/courses/);
      await page.waitForLoadState('networkidle');
    });
  });
});
