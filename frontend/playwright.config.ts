import { defineConfig } from "@playwright/test";
const externalServer = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 1,
  use: {
    baseURL: externalServer ?? "http://localhost:5173",
    headless: true,
    trace: "retain-on-failure",
  },
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: "../evidence/verification/browser-tests.json",
      },
    ],
  ],
  outputDir: "test-results",
  webServer: externalServer ? undefined : {
    command: "npm run build && npm run preview -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    timeout: 180000,
    reuseExistingServer: false,
  },
});
