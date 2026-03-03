import { defineConfig, devices } from "@playwright/test";

const profile = process.env.TEST_PROFILE;
const isSlowNetwork = profile === "commuter" || profile === "worst-case";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  // Filter tests by tag if the env variable is set
  grep: process.env.METRICS_ONLY ? /@metric/ : undefined,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["html", { outputFolder: "tests/results/html-report" }],
    ["list", { printSteps: true }],
    ["./tests/utils/metrics-reporter.ts", { outputFolder: "tests/results" }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "https://local-first-webshop.localhost/",

    ignoreHTTPSErrors: true,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry"
  },
  globalSetup: "./tests/setup/global-setup.ts",

  timeout: isSlowNetwork ? 90000 : 30000,
  expect: {
    timeout: isSlowNetwork ? 45000 : 7500
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],

  /* Run dev server before starting the tests */
  webServer: {
    command: `${
      !process.env.CI ? "pnpm run dev" : "pnpm run build && pnpm run preview"
    } && pnpm run stripe:listen`,
    url: "https://local-first-webshop.localhost/",
    reuseExistingServer: true,
    timeout: 120 * 1000,
    // This is necessary because, the dev server uses a self-signed certificate,
    // and without this, Playwright will fail to connect to it. (Caddy)
    ignoreHTTPSErrors: true
  }
});
