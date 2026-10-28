import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://localhost:5173", headless: true },
  reporter: [
    ["list"],
    ["json", { outputFile: "../evidence/frontend-tests.json" }],
  ],
  outputDir: "test-results",
});
