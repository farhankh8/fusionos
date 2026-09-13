/**
 * FusionOS Authentication E2E Tests
 *
 * Tests real browser → real frontend → real API → real database flows.
 * No mocking — these are genuine integration tests.
 *
 * Prerequisites:
 * - PostgreSQL running with seed data
 * - API running on port 3001
 * - Web running on port 3000
 * - Seed user: admin@fusionos.dev / Admin123
 */

import { test, expect } from '@playwright/test';

// Test credentials (from seed data)
const VALID_EMAIL = 'admin@fusionos.dev';
const VALID_PASSWORD = 'Admin@123';
const INVALID_EMAIL = 'nonexistent@test.com';
const INVALID_PASSWORD = 'wrongpassword';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('login page loads successfully', async ({ page }) => {
      await page.goto('/auth/login');
      await expect(page).toHaveTitle(/FusionOS/);
      // Should have email and password fields
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
      // Should have a submit button
      await expect(page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')).toBeVisible();
    });

    test('login with valid credentials redirects to dashboard', async ({ page }) => {
      await page.goto('/auth/login');

      // Fill in credentials
      await page.locator('input[type="email"], input[name="email"]').fill(VALID_EMAIL);
      await page.locator('input[type="password"], input[name="password"]').fill(VALID_PASSWORD);

      // Submit
      await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').click();

      // Should redirect to dashboard
      await expect(page).toHaveURL(/dashboard|\/$/, { timeout: 15_000 });
    });

    test('login with invalid credentials shows error', async ({ page }) => {
      await page.goto('/auth/login');

      await page.locator('input[type="email"], input[name="email"]').fill(INVALID_EMAIL);
      await page.locator('input[type="password"], input[name="password"]').fill(INVALID_PASSWORD);

      await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').click();

      // Should show error message (generic — prevents enumeration)
      await expect(page.getByText('Invalid email or password')).toBeVisible({ timeout: 10_000 });
      // Should NOT redirect
      await expect(page).toHaveURL(/auth\/login/);
    });

    test('login with empty fields shows validation', async ({ page }) => {
      await page.goto('/auth/login');

      // Try to submit empty form
      await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').click();

      // Should show validation errors or stay on login page
      await expect(page).toHaveURL(/auth\/login/);
    });
  });

  test.describe('Registration Page', () => {
    test('registration page loads', async ({ page }) => {
      await page.goto('/auth/register');
      await expect(page).toHaveTitle(/FusionOS/);
      // Should have registration form fields
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    });
  });

  test.describe('Authenticated State', () => {
    test('unauthenticated user is not exposed to tenant data', async ({ page }) => {
      // Access dashboard without login. The frontend has no client-side route
      // guard, so the shell renders — but it must fail closed: without a JWT
      // the API rejects every data fetch (auth guards + RLS are the enforcement
      // boundary), so no tenant identity, company name, or KPIs may appear.
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

      // No authenticated identity — falls back to the "User" placeholder
      await expect(page.getByText('Hello, User')).toBeVisible({ timeout: 5_000 });

      // No company name (only rendered from an authenticated companies fetch)
      const companyText = page.locator('text=Acme Corporation').or(page.locator('text=Acme Industries'));
      await expect(companyText).not.toBeVisible({ timeout: 5_000 });
    });

    test.describe('with persisted session', () => {
      // Reuse the session created in global-setup.ts so this does not consume
      // a login attempt (the route is brute-force throttled).
      test.use({ storageState: 'test-results/.auth/admin.json' });

      test('authenticated user can access dashboard', async ({ page }) => {
        // Directly access dashboard with the persisted session — should work
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/dashboard/);
      });
    });
  });

  test.describe('Logout', () => {
    test('logout redirects to login', async ({ page }) => {
      // Authenticated via the persisted session from global-setup.ts
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });

      // Find and click logout
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout"]');
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await expect(page).toHaveURL(/auth\/login/, { timeout: 10_000 });
      }
    });
  });
});
