import { inject } from 'vitest';

// Runs before every integration test file (Vitest "setupFiles"),
// before any app module reads process.env.
// DEMO (npm run test:integration:tc): the Testcontainers global setup provides
// the URL of its throwaway Postgres, which wins over everything else.
const containerUrl = inject('databaseUrl');
if (containerUrl) process.env.DATABASE_URL = containerUrl;
process.env.DATABASE_URL ??= 'postgres://election:election@localhost:5433/election_test';
process.env.JWT_SECRET ??= 'test-secret';
