/**
 * FusionOS Playwright Configuration
 *
 * Browser E2E tests for critical user journeys.
 * Tests run against real browser + real frontend + real API.
 *
 * Usage:
 *   npx playwright test                    # Run all tests
 *   npx playwright test --headed           # Run with browser visible
 *   npx playwright test auth               # Run auth tests only
 *   npx playwright show-report             # View test report
 */

import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env['CI'];

export default defineConfig({
  testDir: './e2e',
  // Login once through the real UI and persist the session, so navigation
  // tests reuse storageState instead of repeatedly hitting the login endpoint
  // (intentionally throttled: 5 attempts / 15 min for brute-force protection).
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false, // Sequential for DB state consistency
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: 1, // Single worker for DB state consistency
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env['BASE_URL'] ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: CI
    ? undefined // In CI, assume services are already running
    : {
        command: 'npm run dev',
        port: 3000,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
