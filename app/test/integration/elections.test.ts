import { Pool } from 'pg';
import request from 'supertest';
import { createApp, pgDeps } from '../../src/app';
import { JwtTokenService } from '../../src/auth/tokenService';
import { User } from '../../src/domain/types';
import { aCandidate, aCommissioner, anAdmin, aParty, aVoter } from '../support/builders';
import { createTestPool, truncateAll } from './support/database';
import { authHeaderFor, givenFor } from './support/given';

describe('election management (component)', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  let given: ReturnType<typeof givenFor>;
  // Same secret as JWT_SECRET in env.ts: the legacy vote routes read it from process.env.
  const tokens = new JwtTokenService(process.env.JWT_SECRET!);
  const as = (user: User) => authHeaderFor(tokens, user);

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
  });

  describe('POST /parties', () => {
    const newParty = { name: 'พรรคดอยสุเทพ', policy: 'รถแดงไฟฟ้าทุกเส้นทาง' };

    it('lets a commissioner create a party', async () => {
      const commissioner = await given.user(aCommissioner());

      const res = await request(app).post('/parties').set(as(commissioner)).send(newParty);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject(newParty);
    });

    it('forbids a voter (403)', async () => {
      const voter = await given.user(aVoter());

      const res = await request(app).post('/parties').set(as(voter)).send(newParty);

      expect(res.status).toBe(403);
    });

    it('requires a token (401)', async () => {
      const res = await request(app).post('/parties').send(newParty);

      expect(res.status).toBe(401);
    });

    it('rejects a duplicate party name (409)', async () => {
      const commissioner = await given.user(aCommissioner());
      await given.party(aParty().named('พรรคดอยสุเทพ'));

      const res = await request(app).post('/parties').set(as(commissioner)).send(newParty);

      expect(res.status).toBe(409);
    });
  });

  describe('POST /districts/:id/candidates', () => {
    it('adds a candidate that then appears in the public results of that district', async () => {
      const commissioner = await given.user(aCommissioner());
      const party = await given.party();

      const added = await request(app)
        .post('/districts/CM-2/candidates')
        .set(as(commissioner))
        .send({ partyId: party.id, number: 3, firstName: 'มานี', lastName: 'มีนา' });
      const results = await request(app).get('/districts/CM-2/results');

      expect(added.status).toBe(201);
      expect(results.body.candidates).toEqual([
        { number: 3, firstName: 'มานี', lastName: 'มีนา', partyName: party.name },
      ]);
    });
  });

  describe('PATCH /admin/users/:id/role', () => {
    it('lets an admin promote a voter to commissioner', async () => {
      const admin = await given.user(anAdmin());
      const voter = await given.user(aVoter());

      const res = await request(app)
        .patch(`/admin/users/${voter.id}/role`)
        .set(as(admin))
        .send({ role: 'COMMISSIONER' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: voter.id, role: 'COMMISSIONER' });
    });
  });

  describe('GET /me/candidates', () => {
    it('shows a voter only the candidates of their own district', async () => {
      const party = await given.party();
      await given.candidate(aCandidate().inDistrict('CM-1').forParty(party.id).numbered(1));
      await given.candidate(aCandidate().inDistrict('CM-2').forParty(party.id).numbered(7));
      const voter = await given.user(aVoter().inDistrict('CM-2'));

      const res = await request(app).get('/me/candidates').set(as(voter));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ number: 7, party: party.name, selected: false });
    });
  });
});
