import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    headless: true,
    trace: "retain-on-failure",
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "../evidence/redesign/browser-tests.json" }],
  ],
  outputDir: "test-results",
  testIgnore: process.env.PWA_TEST === "1" ? [] : ["**/pwa.spec.ts"],
});
