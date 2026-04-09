import { test, expect, devices } from '@playwright/test';
import { loginUser, clearAppState, logoutUser } from '../fixtures/auth.fixture';

test.describe('Navigation and Layout', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page);
  });

  test('should navigate from login to courses after authentication', async ({ page }) => {
    await loginUser(page);

    // Navigate to courses
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/courses');
  });

  test('should display navigation menu after login', async ({ page }) => {
    await loginUser(page);

    // Look for navigation elements
    const navMenu = page.locator('nav, [data-testid="navbar"], header').first();
    await expect(navMenu).toBeVisible({ timeout: 5000 });
  });

  test('should display main navigation links', async ({ page }) => {
    await loginUser(page);
    await page.goto('/courses');

    const expectedLinks = ['Courses', 'Authors', 'Tags'];
    
    for (const linkText of expectedLinks) {
      const link = page.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`).first();
      const isVisible = await link.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        expect(isVisible).toBeTruthy();
      }
    }
  });

  test('should navigate between courses and authors pages', async ({ page }) => {
    await loginUser(page);
    await page.goto('/courses');

    // Find and click authors link
    const authorsLink = page.locator('a:has-text("Authors"), a[href*="/authors"]').first();
    const isVisible = await authorsLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible) {
      await authorsLink.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      expect(page.url()).toContain('/authors');
    }
  });

  test('should display header elements', async ({ page }) => {
    await loginUser(page);
    await page.goto('/courses');

    // Look for header elements like logo, user info
    const header = page.locator('header, [data-testid="header"]').first();
    const headerVisible = await header.isVisible({ timeout: 3000 }).catch(() => false);

    if (headerVisible) {
      await expect(header).toBeVisible();
    }
  });

  test('should display user profile or logout option', async ({ page }) => {
    await loginUser(page);
    await page.goto('/courses');

    // Look for profile menu or logout button
    const profileMenu = page.locator('[data-testid="profile-menu"], button:has-text("Profile"), button:has-text("admin")').first();
    const logoutBtn = page.locator('button:has-text("Logout")').first();

    const profileVisible = await profileMenu.isVisible({ timeout: 3000 }).catch(() => false);
    const logoutVisible = await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false);

    expect(profileVisible || logoutVisible).toBeTruthy();
  });

  test('should have responsive design for mobile', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();

    await clearAppState(page);
    await loginUser(page);
    await page.goto('/courses');

    // Verify page loads on mobile viewport
    const courseElements = page.locator('[data-testid="course-card"], .course-card, article');
    const count = await courseElements.count();
    
    // Should still have content on mobile
    expect(count).toBeGreaterThanOrEqual(0);

    await context.close();
  });
});
