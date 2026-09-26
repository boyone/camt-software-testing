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
    // Coverage gate only where unit tests are the right tool. Routes and
    // repositories are covered by component/integration tests instead.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts'],
      thresholds: {
        'src/domain/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/services/**': { statements: 75, branches: 70, functions: 90, lines: 80 },
      },
    },
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
          setupFiles: ['test/support/seedFaker.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['test/integration/**/*.test.ts'],
          setupFiles: ['test/integration/env.ts', 'test/support/seedFaker.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
});
