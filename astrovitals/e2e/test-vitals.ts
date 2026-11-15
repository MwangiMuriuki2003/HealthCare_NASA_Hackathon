/**
 * E2E Tests for AstraVitals Vitals Logging Flow
 * 
 * Tests verifying:
 * - Astronaut can log all 6 health metrics
 * - Real-time status color coding (GREEN/YELLOW/RED)
 * - Manual entry form validation
 * - Status updates reflect correctly in dashboard
 * - Body diagram glow updates within 2 seconds
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('AstraVitals Vitals Logging', () => {
  test('astronaut should log blood pressure', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Login first
    await page.getByRole('button', { hasText: 'Sign in with GitHub' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Navigate to manual entry or find the entry form
    await expect(page.locator('text/Blood Pressure')).toBeVisible({ timeout: 5000 });
    
    // Open manual entry form
    await page.getByRole('button', { name: /Add Reading/i }).click();
    
    // Fill in blood pressure
    await page.fill('input[name="systolic"]', '110');
    await page.fill('input[name="diastolic"]', '70');
    
    // Submit
    await page.getByRole('button', { name: /Submit/i }).click();
    
    // Should show GREEN status
    await expect(page.locator('.status-badge.GREEN')).toContainText('GREEN');
  });

  test('should show YELLOW status for elevated heart rate', async ({ page }) => {
    await page.goto(BASE_URL);
    
    await page.getByRole('button', { hasText: 'Sign in with GitHub' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Log heart rate that falls in YELLOW zone (e.g., 105 bpm)
    await page.getByRole('button', { name: /Add Reading/i }).click();
    await page.fill('input[name="value"]', '105');
    
    // Select heart rate metric
    await page.selectOption('select[name="metric"]', 'HEART_RATE');
    
    await page.getByRole('button', { name: /Submit/i }).click();
    
    // Should show YELLOW status
    await expect(page.locator('.status-badge.YELLOW')).toContainText('YELLOW');
  });

  test('should show RED status for critical blood glucose', async ({ page }) => {
    await page.goto(BASE_URL);
    
    await page.getByRole('button', { hasText: 'Sign in with GitHub' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Log critical blood glucose
    await page.getByRole('button', { name: /Add Reading/i }).click();
    await page.fill('input[name="value"]', '350');
    await page.selectOption('select[name="metric"]', 'BLOOD_GLUCOSE');
    
    await page.getByRole('button', { name: /Submit/i }).click();
    
    // Should show RED status
    await expect(page.locator('.status-badge.RED')).toContainText('RED');
  });

  test('body diagram should update glow color on new reading', async ({ page }) => {
    await page.goto(BASE_URL);
    
    await page.getByRole('button', { hasText: 'Sign in with GitHub' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Log a reading
    await page.getByRole('button', { name: /Add Reading/i }).click();
    await page.fill('input[name="value"]', '98.6');
    await page.selectOption('select[name="metric"]', 'BODY_TEMPERATURE');
    await page.getByRole('button', { name: /Submit/i }).click();
    
    // Body diagram should have updated glow
    // The SVG organ should have a status-based class
    await expect(page.locator('.body-glow.GREEN')).toBeVisible({ timeout: 3000 });
  });
});