import { test, expect } from '@playwright/test';

test.describe('Admin Routes & Loading', () => {
  test('admin dashboard page loads without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/tokki-admin');
    await page.waitForLoadState('networkidle');

    const criticalErrors = consoleErrors.filter(
      (err) =>
        err.includes('Refused to apply style') ||
        err.includes('Unable to preload CSS') ||
        err.includes('Failed to load resource: the server responded with a status of 404'),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('admin sign-in page loads without stylesheet MIME error', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/tokki-admin/sign-in');
    await page.waitForLoadState('networkidle');

    const criticalErrors = consoleErrors.filter(
      (err) =>
        err.includes('Refused to apply style') ||
        err.includes('Unable to preload CSS') ||
        err.includes('Failed to load resource: the server responded with a status of 404'),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
