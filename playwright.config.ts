import { defineConfig, devices } from "@playwright/test";

// Node 22+ loads .env natively — E2E_EMAIL / E2E_PASSWORD live there (never in git).
try {
  process.loadEnvFile();
} catch {
  // No .env (e.g. CI) — credentials must come from the environment.
}

export default defineConfig({
  testDir: "./tests/e2e",
  // One shared smoke account: summary/category assertions are account-global,
  // so parallel workers can interfere (seen once on 4 workers). Serial is ~35 s.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4321",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
