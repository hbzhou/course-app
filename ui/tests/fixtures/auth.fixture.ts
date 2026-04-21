import { Page, expect } from '@playwright/test';

/**
 * Test Fixtures and Helpers for Authentication and Navigation
 */

export const TEST_USER = {
  username: 'admin',
  password: 'admin123',
};

/**
 * Helper to login a user
 */
export async function loginUser(page: Page, username = TEST_USER.username, password = TEST_USER.password) {
  await page.goto('/login');
  
  // Wait for login form to be visible
  await page.waitForSelector('input[name="username"]', { timeout: 5000 });
  
  // Fill in credentials
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for URL to change (React Router handles navigation client-side)
  // Expect to be redirected away from /login
  try {
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
  } catch {
    // If URL doesn't change, still proceed and check token
    // Some apps might redirect after token is set
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  
  // Wait a bit for localStorage to be updated
  await page.waitForFunction(
    () => localStorage.getItem('token'),
    { timeout: 5000 }
  );
  
  // Verify login was successful by checking localStorage
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeTruthy();
  
  return token;
}

/**
 * Helper to logout a user
 */
export async function logoutUser(page: Page) {
  // Click logout button (usually in header/profile menu)
  const logoutBtn = page.locator('button:has-text("Logout")').first();
  
  const logoutVisible = await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (logoutVisible) {
    await logoutBtn.click();
  } else {
    // Try clicking profile menu first if layout is different
    const profileBtn = page.locator('[data-testid="profile-menu"], button:has-text("Profile")').first();
    const profileVisible = await profileBtn.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (profileVisible) {
      await profileBtn.click();
      await page.locator('[data-testid="logout-btn"], button:has-text("Logout")').first().click();
    }
  }
  
  // Wait for redirect to login (with fallback)
  try {
    await page.waitForURL('**/login', { timeout: 5000 });
  } catch {
    // If redirect doesn't happen, just proceed
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  
  // Verify token is cleared
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeNull();
}

/**
 * Helper to check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  return !!token;
}

/**
 * Helper to clear storage and reset app state
 */
export async function clearAppState(page: Page) {
  // Navigate to app first to establish origin context for localStorage
  await page.goto('/').catch(() => {});
  
  // Now clear storage within the app context
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  }).catch(() => {
    // Ignore errors if localStorage is not accessible
  });
}

/**
 * Helper to wait for API calls to complete
 */
export async function waitForApiCall(page: Page, urlPattern: string | RegExp, action: () => Promise<void>) {
  const responsePromise = page.waitForResponse(response => {
    if (typeof urlPattern === 'string') {
      return response.url().includes(urlPattern);
    }
    return urlPattern.test(response.url());
  });
  
  await action();
  const response = await responsePromise;
  
  return response;
}
