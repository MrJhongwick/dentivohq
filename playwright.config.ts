import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: { baseURL: "http://localhost:4321", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }, { name: "mobile-chromium", use: { ...devices["Pixel 7"] } }],
  webServer: [
    { command: "pnpm --filter @dentivohq/landing dev", url: "http://localhost:4321", reuseExistingServer: true },
    { command: "pnpm --filter @dentivohq/dashboard dev", url: "http://localhost:5173", reuseExistingServer: true },
    { command: "pnpm --filter @dentivohq/console dev", url: "http://localhost:5174", reuseExistingServer: true }
  ]
});
