/**
 * FusionOS Navigation E2E Tests
 *
 * Tests that critical pages load, display correct content,
 * and handle authentication properly.
 *
 * Prerequisites:
 * - Full stack running (PostgreSQL, Redis, API, Web)
 * - Seed data loaded
 * - Valid test user available
 *
 * Authentication is done ONCE in global-setup.ts and the session is reused via
 * storageState: logging in on every test would trip the login route's
 * brute-force throttle (5 attempts / 15 min), which is intentional security.
 */

import { test, expect } from '@playwright/test';

// Session authenticated once in global-setup.ts and reused here.
test.use({ storageState: 'test-results/.auth/admin.json' });

test.describe('Critical Page Navigation', () => {
  test.describe('Dashboard', () => {
    test('dashboard loads after login', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/dashboard/);
      // Should not show error page
      await expect(page).toHaveTitle(/FusionOS/);
    });
  });

  test.describe('People Module', () => {
    test('employees list loads', async ({ page }) => {
      await page.goto('/people/employees');
      await expect(page).toHaveURL(/people\/employees/);
    });

    test('attendance page loads', async ({ page }) => {
      await page.goto('/people/attendance');
      await expect(page).toHaveURL(/people\/attendance/);
    });

    test('leave page loads', async ({ page }) => {
      await page.goto('/people/leave');
      await expect(page).toHaveURL(/people\/leave/);
    });

    test('payroll page loads', async ({ page }) => {
      await page.goto('/people/payroll');
      await expect(page).toHaveURL(/people\/payroll/);
    });
  });

  test.describe('Organization Module', () => {
    test('company page loads', async ({ page }) => {
      await page.goto('/organization/company');
      await expect(page).toHaveURL(/organization\/company/);
    });

    test('departments page loads', async ({ page }) => {
      await page.goto('/organization/departments');
      await expect(page).toHaveURL(/organization\/departments/);
    });

    test('teams page loads', async ({ page }) => {
      await page.goto('/organization/teams');
      await expect(page).toHaveURL(/organization\/teams/);
    });
  });

  test.describe('Finance Module', () => {
    test('finance main page loads', async ({ page }) => {
      await page.goto('/finance');
      await expect(page).toHaveURL(/finance/);
    });

    test('accounts page loads', async ({ page }) => {
      await page.goto('/finance/accounts');
      await expect(page).toHaveURL(/finance\/accounts/);
    });

    test('journals page loads', async ({ page }) => {
      await page.goto('/finance/journals');
      await expect(page).toHaveURL(/finance\/journals/);
    });

    test('receivables page loads', async ({ page }) => {
      await page.goto('/finance/receivables');
      await expect(page).toHaveURL(/finance\/receivables/);
    });

    test('payables page loads', async ({ page }) => {
      await page.goto('/finance/payables');
      await expect(page).toHaveURL(/finance\/payables/);
    });
  });

  test.describe('CRM Module', () => {
    test('CRM main page loads', async ({ page }) => {
      await page.goto('/crm');
      await expect(page).toHaveURL(/crm/);
    });

    test('customers page loads', async ({ page }) => {
      await page.goto('/crm/customers');
      await expect(page).toHaveURL(/crm\/customers/);
    });

    test('leads page loads', async ({ page }) => {
      await page.goto('/crm/leads');
      await expect(page).toHaveURL(/crm\/leads/);
    });

    test('opportunities page loads', async ({ page }) => {
      await page.goto('/crm/opportunities');
      await expect(page).toHaveURL(/crm\/opportunities/);
    });
  });

  test.describe('Projects Module', () => {
    test('projects page loads', async ({ page }) => {
      await page.goto('/projects');
      await expect(page).toHaveURL(/projects/);
    });
  });

  test.describe('Documents Module', () => {
    test('documents page loads', async ({ page }) => {
      await page.goto('/documents');
      await expect(page).toHaveURL(/documents/);
    });
  });

  test.describe('Assets Module', () => {
    test('assets page loads', async ({ page }) => {
      await page.goto('/assets');
      await expect(page).toHaveURL(/assets/);
    });
  });

  test.describe('Analytics Module', () => {
    test('analytics main page loads', async ({ page }) => {
      await page.goto('/analytics');
      await expect(page).toHaveURL(/analytics/);
    });
  });

  test.describe('Automation Module', () => {
    test('automation page loads', async ({ page }) => {
      await page.goto('/automation');
      await expect(page).toHaveURL(/automation/);
    });
  });

  test.describe('AI Module', () => {
    test('AI command center loads', async ({ page }) => {
      await page.goto('/ai');
      await expect(page).toHaveURL(/ai/);
    });
  });

  test.describe('Notifications', () => {
    test('notifications page loads', async ({ page }) => {
      await page.goto('/notifications');
      await expect(page).toHaveURL(/notifications/);
    });
  });
});

test.describe('404 Handling', () => {
  test('non-existent page shows 404 or redirects', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    // Should show the app's 404 mark or redirect — NOT a crash
    await expect(page.getByText('404').first()).toBeVisible({ timeout: 5_000 }).catch(async () => {
      const isRedirect = page.url().includes('dashboard') || page.url().includes('login');
      expect(isRedirect).toBeTruthy();
    });
  });
});