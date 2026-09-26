// Lab 07 — pin down what PUT /me/vote does TODAY, before changing it.
// A characterization test records current behaviour, even when it looks wrong.
import { Pool } from 'pg';
import request from 'supertest';
import { createApp, pgDeps } from '../../src/app';
import { JwtTokenService } from '../../src/auth/tokenService';
import { pool as legacyPool } from '../../src/db';
import { User } from '../../src/domain/types';
import { createTestPool, truncateAll } from './support/database';
import { authHeaderFor, givenFor } from './support/given';

describe('PUT /me/vote (characterization)', () => {
  // ❓ Why must this be process.env.JWT_SECRET and not any secret we like?
  const tokens = new JwtTokenService(process.env.JWT_SECRET!);
  const as = (user: User) => authHeaderFor(tokens, user);

  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  let given: ReturnType<typeof givenFor>;

  beforeAll(() => {
    pool = createTestPool();
    app = createApp(pgDeps(pool, tokens));
    given = givenFor(pool);
  });

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await pool.end();
    // ❓ Why do we also have to close a pool this test never created?
    //    (Comment this line out and run `npm run test:integration` — what does Jest print at the end?)
    await legacyPool.end();
  });

  it.todo('records a first vote (201, changed: false)');
  it.todo('changes an existing vote (200, changed: true) and keeps one vote per voter');
  it.todo('refuses a candidate from another district (403)');
  it.todo('answers 404 for an unknown candidate');
  it.todo('refuses to vote before the election opens (409)');
  it.todo('refuses to vote when no election is configured (409)');
  it.todo('refuses a commissioner (403)');
  it.todo('requires a candidateId (400)');
  it.todo('requires a token (401)');
  it.todo('… and whatever surprising behaviour you discover');
});
