/**
 * FusionOS Playwright global setup.
 *
 * Logs in ONCE through the real UI and persists the authenticated session to
 * storageState so navigation tests reuse it instead of hammering the login
 * endpoint. The login route is intentionally throttled (5 attempts / 15 min)
 * for brute-force protection — repeated per-test logins would trigger it.
 */

import { chromium } from '@playwright/test';

const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@fusionos.dev';
const ADMIN_PASSWORD = 'Admin@123';
const STORAGE_PATH = 'test-results/.auth/admin.json';

export default async function globalSetup(): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  await page.goto('/auth/login');
  await page
    .locator('input[type="email"], input[name="email"]')
    .fill(ADMIN_EMAIL);
  await page
    .locator('input[type="password"], input[name="password"]')
    .fill(ADMIN_PASSWORD);
  await page
    .locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')
    .click();
  await page.waitForURL(/dashboard|\/$/, { timeout: 30_000 });

  await context.storageState({ path: STORAGE_PATH });
  await browser.close();
}