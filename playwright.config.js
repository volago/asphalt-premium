import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  retries: 0,
  workers: 1, // Jednostkowy worker na początek, żeby widzieć logi poprawnie
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:8081',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
