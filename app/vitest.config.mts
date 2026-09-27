import { defineConfig } from 'vitest/config';

// Two projects = two test boundaries, visible right in the config.
//   unit        — no I/O, runs in parallel          (npm run test:unit)
//   integration — real Postgres, one file at a time (npm run test:integration)
//
// Vitest strips types without checking them, so the test scripts run
// `tsc --noEmit` first. TypeScript 7 is native — the whole project checks in
// well under a second, and a type error still fails the run.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['test/integration/**/*.test.ts'],
          setupFiles: ['test/integration/env.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
});
