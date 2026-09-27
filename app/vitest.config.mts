import { defineConfig } from 'vitest/config';

// Two projects = two test boundaries, visible right in the config.
//   unit        — no I/O, runs in parallel          (npm run test:unit)
//   integration — real Postgres, one file at a time (npm run test:integration)
//
// Vitest strips types without checking them, so the test scripts run
// `tsc --noEmit` first. TypeScript 7 is native — the whole project checks in
// well under a second, and a type error still fails the run.
const integration = {
  environment: 'node',
  include: ['test/integration/**/*.test.ts'],
  setupFiles: ['test/integration/env.ts', 'test/support/seedFaker.ts'],
  fileParallelism: false,
};

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
          setupFiles: ['test/support/seedFaker.ts'],
        },
      },
      { test: { name: 'integration', ...integration } },
      // DEMO: the same tests on a throwaway Postgres from Testcontainers
      // (npm run test:integration:tc). Vitest runs globalSetup only for this project.
      {
        test: {
          name: 'integration-tc',
          ...integration,
          globalSetup: ['test/testcontainers/globalSetup.ts'],
        },
      },
    ],
  },
});
