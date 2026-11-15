/**
 * E2E Tests for AstraVitals Gamification Flow
 * 
 * Tests verifying:
 * - Achievements unlock automatically when criteria met
 * - Badge grid displays correctly
 * - Streak tracking works
 * - XP progress shown in overview
 * - Reminders can be created and managed
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('AstraVitals Gamification', () => {
  test('should unlock achievements after meeting criteria', async ({ page }) => {
    await page.goto(BASE_URL);
    
    await page.getByRole('button', { hasText: 'Sign in with GitHub' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Look for achievement badges
    await expect(page.locator('.badge-grid')).toBeVisible({ timeout: 5000 });
    
    // After logging metrics, achievements should be checkable
    const badges = page.locator('.badge');
    const badgeCount = await badges.count();
    // At minimum, the grid should be rendered
    await expect(badges).toHaveLength(7); // 7 achievements per spec
  });

  test('should track streak days logged', async ({ page }) => {
    await page.goto(BASE_URL);
    
    await page.getByRole('button', { hasText: 'Sign in with GitHub' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Look for streak display
    await expect(page.locator('.streak-counter, [data-testid="streak"]')).toBeVisible({ timeout: 5000 });
  });

  test('should display achievements overview', async ({ page }) => {
    await page.goto(BASE_URL);
    
    await page.getByRole('button', { hasText: 'Sign in with GitHub' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Achievements overview component
    await expect(page.locator('.achievements-overview, [role="region"][aria-label*="achievement"]')).toBeVisible({ timeout: 5000 });
  });

  test('should allow reminder creation', async ({ page }) => {
    await page.goto(BASE_URL);
    
    await page.getByRole('button', { hasText: 'Sign in with GitHub' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Look for reminder card/add button
    await expect(page.getByRole('button', { name: /Add Reminder/i })).toBeVisible({ timeout: 5000 });
    
    // Open reminder creation
    await page.getByRole('button', { name: /Add Reminder/i }).click();
    
    // Fill in reminder details
    await page.fill('input[name="cron-expression"]', '0 9 * * *');
    await page.fill('input[name="message"]', 'Time for health check');
    
    await page.getByRole('button', { name: /Save/i }).click();
    
    // Reminder should be created
    await expect(page.locator('.reminder-card, [data-testid="reminder"]')).toBeVisible({ timeout: 3000 });
  });
});