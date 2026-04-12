/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Test Configuration
 * https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  
  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
    ['list'],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `goto()` */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 },
    },
  },

  /* Configure projects for major browsers */
  projects: process.env.CI
    ? [
        // Chrome
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },

        // WebKit
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
      ]
    : [
        // Local: only Chromium (faster)
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ],

  /* Run mock API and local dev server before starting tests */
  webServer: [
    {
      command: 'npm run e2e:mock-server',
      url: 'http://127.0.0.1:18081/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'VITE_API_PROXY_TARGET=http://127.0.0.1:18081 VITE_WS_PROXY_TARGET=ws://127.0.0.1:18081 npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],

  /* Timeouts */
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
});
