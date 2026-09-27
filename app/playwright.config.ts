import { defineConfig } from '@playwright/test';

// End-to-end tests treat the app as a black box: it runs in its own
// container (docker compose "app" service) and we only talk HTTP to it.
export default defineConfig({
  testDir: './e2e',
  // The HTML report (npx playwright show-report) keeps the trace and
  // screenshot of every failed browser test.
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Playwright has no --slow-mo flag; SLOW_MO=500 slows each browser
    // action so the room can follow a --headed run.
    launchOptions: { slowMo: Number(process.env.SLOW_MO ?? 0) },
  },
});
