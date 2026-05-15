import { defineConfig, devices } from "@playwright/test";

/** Définir PW_HEADED=1 (npm run e2e:watch) pour voir Chrome naviguer sur l'app. */
const isHeaded = !!process.env.PW_HEADED;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: !isHeaded,
  workers: isHeaded ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["list"]]
    : [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:5173",
    headless: !isHeaded,
    channel: isHeaded ? "chrome" : undefined,
    launchOptions: {
      slowMo: isHeaded ? 600 : 0,
    },
    trace: process.env.CI ? "on-first-retry" : isHeaded ? "on" : "off",
    video: isHeaded ? "on" : "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
