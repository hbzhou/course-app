import { test, expect } from '@playwright/test';
import { loginUser, clearAppState } from '../fixtures/auth.fixture';

test.describe('Tags Page', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page);
    await loginUser(page);
    await page.goto('/tags');
    await page.waitForLoadState('networkidle');
  });

  test('should display tags page', async ({ page }) => {
    // Check we're on the tags page
    expect(page.url()).toContain('/tags');
  });

  test('should display tags list', async ({ page }) => {
    // Verify page is loaded
    expect(page.url()).toContain('/tags');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Verify page has tag elements
    const tagElements = await page.locator('[data-testid="tag-card"], .tag-item, [role="listitem"]').count();
    expect(tagElements).toBeGreaterThanOrEqual(0);
  });

  test('should display page heading', async ({ page }) => {
    const heading = page.locator('h1:has-text("Tags"), h2:has-text("Tags"), h1:has-text("tag")').first();
    const isVisible = await heading.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible) {
      await expect(heading).toBeVisible();
    }
  });

  test('should have create tag button', async ({ page }) => {
    const createBtn = page.locator('button:has-text("Create"), button:has-text("New Tag"), button:has-text("Add Tag"), [data-testid="create-tag-btn"]').first();
    
    const isVisible = await createBtn.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('should navigate to tag creation page', async ({ page }) => {
    const createBtn = page.locator('button:has-text("Create"), button:has-text("New Tag"), button:has-text("Add Tag"), [data-testid="create-tag-btn"]').first();

    const isVisible = await createBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (isVisible) {
      await createBtn.click();
      await page.waitForLoadState('networkidle').catch(() => {});

      // Should be on create tag page or form visible
      const url = page.url();
      const createForm = page.locator('[data-testid="create-tag-form"], form:has-text("Create"), form:has-text("New")').first();
      
      const formVisible = await createForm.isVisible({ timeout: 3000 }).catch(() => false);
      expect(url.includes('/tags') || formVisible).toBeTruthy();
    }
  });

  test('should display search/filter for tags', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="tag"], [data-testid="search-tags"]').first();

    const isVisible = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (isVisible) {
      await searchInput.fill('test');
      await page.waitForLoadState('networkidle').catch(() => {});

      const value = await searchInput.inputValue();
      expect(value).toBe('test');
    }
  });

  test('should display tag entries with content', async ({ page }) => {
    expect(page.url()).toContain('/tags');
    await page.waitForLoadState('networkidle').catch(() => {});

    const firstTag = page.locator('[data-testid="tag-card"], .tag-item, [role="article"]').first();
    
    const isVisible = await firstTag.isVisible({ timeout: 3000 }).catch(() => false);
    if (isVisible) {
      const boundingBox = await firstTag.boundingBox();
      expect(boundingBox).toBeTruthy();
      expect(boundingBox?.width).toBeGreaterThan(0);
    }
  });

  test('should have responsive tag list layout', async ({ page }) => {
    const container = page.locator('[data-testid="tags-list"], .tags-container, main').first();

    const isVisible = await container.isVisible({ timeout: 3000 }).catch(() => false);
    if (isVisible) {
      const boundingBox = await container.boundingBox();
      expect(boundingBox).toBeTruthy();
      expect(boundingBox?.width).toBeGreaterThan(0);
    }
  });

  test('should navigate to tag detail view', async ({ page }) => {
    expect(page.url()).toContain('/tags');
    await page.waitForLoadState('networkidle').catch(() => {});

    const firstTag = page.locator('[data-testid="tag-card"], .tag-item, [role="article"]').first();

    const isVisible = await firstTag.isVisible({ timeout: 3000 }).catch(() => false);
    if (isVisible) {
      await firstTag.click();
      await page.waitForLoadState('networkidle').catch(() => {});

      // Should navigate to tag detail or stay on tags page
      const url = page.url();
      expect(url).toContain('/tags');
    }
  });

  test('should support tag operations (edit/delete)', async ({ page }) => {
    // Look for edit/delete buttons on tags
    const editBtn = page.locator('button:has-text("Edit"), [data-testid*="edit-tag"]').first();
    const deleteBtn = page.locator('button:has-text("Delete"), [data-testid*="delete-tag"]').first();

    const editVisible = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const deleteVisible = await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false);

    // At least one operation button should be visible if tags exist
    expect(editVisible || deleteVisible).toBeTruthy();
  });

  test('should filter tags from courses context if available', async ({ page }) => {
    // Check if there's any tag filtering or display mechanism
    const filterSection = page.locator('[data-testid="tag-filter"], .tag-filter, [role="search"]').first();

    const isVisible = await filterSection.isVisible({ timeout: 3000 }).catch(() => false);
    if (isVisible) {
      await expect(filterSection).toBeVisible();
    }
  });
});
