import { defineConfig } from 'vitest/config';

// Two projects = two test boundaries.
//   npm run test:unit         → no I/O, parallel
//   npm run test:integration  → real database, one file at a time
//
// Same file for TypeScript and JavaScript projects: Vitest runs .ts as is,
// no ts-jest or transform needed. It strips types without checking them, so
// keep `tsc --noEmit` (npm run typecheck) as its own step.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.{js,ts}'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['test/integration/**/*.test.{js,ts}'],
          setupFiles: ['test/integration/env.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
});
