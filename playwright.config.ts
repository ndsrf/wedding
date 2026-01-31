import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Wedding Planner E2E Tests
 *
 * Supports sequential test execution with database setup:
 * 1. db_setup - Resets database and seeds NEW_USER data
 * 2. auth_setup - Authenticates as all three user roles
 * 3. onboarding_suite - Tests onboarding flows
 * 4. db_seed_full - Seeds EXISTING_WEDDING data
 * 5. functional_suite - Tests main application features
 *
 * Run with: npm run test:e2e
 * Run specific project: npm run test:e2e -- --project=auth_setup
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests sequentially to maintain database state between suites */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Sequential execution: 1 worker prevents database race conditions */
  workers: 1,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for sequential execution with dependencies */
  projects: [
    // Step 1: Database Setup - Reset database and seed NEW_USER mode
    {
      name: 'db_setup',
      testMatch: /db\.setup\.ts/,
    },

    // Step 2: Auth Setup - Authenticate as each role and save storage state
    {
      name: 'auth_setup',
      testMatch: /auth\.setup\.ts/,
      dependencies: ['db_setup'],
    },

    // Step 3: Onboarding Tests - Test user onboarding flows
    {
      name: 'onboarding_suite',
      testDir: './tests/e2e/onboarding',
      dependencies: ['auth_setup'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // Step 4: Seed Full Wedding - Reset database and seed EXISTING_WEDDING mode
    {
      name: 'db_seed_full',
      testMatch: /db\.seed-full\.ts/,
      dependencies: ['onboarding_suite'],
    },

    // Step 5: Functional Tests - Test main application features with full wedding data
    {
      name: 'functional_suite',
      testDir: './tests/e2e/functional',
      dependencies: ['db_seed_full'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Global timeout for each test */
  timeout: 60 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 10 * 1000,
  },
});
