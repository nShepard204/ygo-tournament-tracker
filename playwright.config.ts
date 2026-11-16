import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Load .env.local the same way `next dev` does, so the tests see the same
// Clerk keys and MONGODB_URI as the app.
loadEnvConfig(process.cwd(), true);

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Every test signs in as the same Clerk test user and resets that user's
  // Mongo document, so tests must not run concurrently.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Dev-mode compiles on first visit can be slow.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      // The home page shows the event list and new-event form at md+ widths.
      name: "desktop",
      testMatch: ["public.spec.ts", "desktop/**/*.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Below md, the home page is the quick-action grid (where rounds are logged).
      name: "mobile",
      testMatch: ["mobile/**/*.spec.ts"],
      use: { ...devices["Pixel 7"] },
    },
  ],
  // Reuses the dev server already running on port 3000, or starts one.
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
