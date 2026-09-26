import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import request from 'supertest';
import { createApp, pgDeps } from '../../src/app';
import { JwtTokenService } from '../../src/auth/tokenService';
import { Clock } from '../../src/clock';
import { User } from '../../src/domain/types';
import { aCandidate, aCommissioner, aParty, aVoter } from '../support/builders';
import { createTestPool, truncateAll } from './support/database';
import { authHeaderFor, givenFor } from './support/given';

describe('closing a poll (component)', () => {
  const CLOSING_TIME = new Date('2026-10-04T17:00:00+07:00');
  const fixedClock: Clock = { now: () => CLOSING_TIME };
  const tokens = new JwtTokenService(process.env.JWT_SECRET!);
  const as = (user: User) => authHeaderFor(tokens, user);

  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  let given: ReturnType<typeof givenFor>;

  beforeAll(() => {
    pool = createTestPool();
    app = createApp(pgDeps(pool, tokens, { clock: fixedClock }));
    given = givenFor(pool);
  });

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /districts/:id/close', () => {
    it('lets a commissioner close the poll at the current time', async () => {
      const commissioner = await given.user(aCommissioner());

      const res = await request(app).post('/districts/CM-1/close').set(as(commissioner));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ districtId: 'CM-1', closedAt: CLOSING_TIME.toISOString() });
    });

    it('forbids a voter (403)', async () => {
      const voter = await given.user(aVoter());

      const res = await request(app).post('/districts/CM-1/close').set(as(voter));

      expect(res.status).toBe(403);
    });

    it('refuses to close the same poll twice (409)', async () => {
      const commissioner = await given.user(aCommissioner());
      await given.closedPoll('CM-1');

      const res = await request(app).post('/districts/CM-1/close').set(as(commissioner));

      expect(res.status).toBe(409);
    });

    it('answers 404 for an unknown district', async () => {
      const commissioner = await given.user(aCommissioner());

      const res = await request(app).post('/districts/XX-9/close').set(as(commissioner));

      expect(res.status).toBe(404);
    });
  });

  describe('GET /districts/:id/results', () => {
    it('counts the votes of each candidate once the poll is closed', async () => {
      const party = await given.party(aParty().named('พรรคดอยสุเทพ'));
      const other = await given.party(aParty().named('พรรคแม่ปิง'));
      const one = await given.candidate(aCandidate().inDistrict('CM-1').forParty(party.id).numbered(1));
      await given.candidate(aCandidate().inDistrict('CM-1').forParty(other.id).numbered(2));
      await given.vote(await given.user(aVoter()), one);
      await given.vote(await given.user(aVoter()), one);
      await given.closedPoll('CM-1', CLOSING_TIME);

      const res = await request(app).get('/districts/CM-1/results');

      expect(res.body).toMatchObject({
        closed: true,
        closedAt: CLOSING_TIME.toISOString(),
        candidates: [
          { number: 1, partyName: 'พรรคดอยสุเทพ', votes: 2 },
          { number: 2, partyName: 'พรรคแม่ปิง', votes: 0 },
        ],
      });
    });
  });
});
