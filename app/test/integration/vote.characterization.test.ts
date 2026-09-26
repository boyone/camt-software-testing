// Characterization tests: they pin down what PUT /me/vote does TODAY, including
// the odd parts. They were written before any change to voteRoutes.ts.
import { Pool } from 'pg';
import request from 'supertest';
import { createApp, pgDeps } from '../../src/app';
import { JwtTokenService } from '../../src/auth/tokenService';
import { Candidate, User } from '../../src/domain/types';
import { aCandidate, aCommissioner, aParty, aVoter } from '../support/builders';
import { createTestPool, truncateAll } from './support/database';
import { authHeaderFor, givenFor } from './support/given';

const HOUR = 60 * 60 * 1000;

describe('PUT /me/vote (characterization)', () => {
  const tokens = new JwtTokenService(process.env.JWT_SECRET!);
  const as = (user: User) => authHeaderFor(tokens, user);

  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  let given: ReturnType<typeof givenFor>;
  let log: jest.SpyInstance;

  beforeAll(() => {
    pool = createTestPool();
    app = createApp(pgDeps(pool, tokens));
    given = givenFor(pool);
  });

  beforeEach(async () => {
    await truncateAll(pool);
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    log.mockRestore();
  });

  afterAll(async () => {
    await pool.end();
  });

  async function candidateIn(districtId: string, number = 1): Promise<Candidate> {
    const party = await given.party(aParty());
    return given.candidate(aCandidate().inDistrict(districtId).forParty(party.id).numbered(number));
  }

  async function openElection() {
    await given.electionOpenedAt(new Date(Date.now() - HOUR));
  }

  it('records a first vote (201, changed: false) and writes an audit log line', async () => {
    await openElection();
    const candidate = await candidateIn('CM-1');
    const voter = await given.user(aVoter().inDistrict('CM-1'));

    const res = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: candidate.id });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ candidateId: candidate.id, changed: false, votedAt: expect.any(String) });
    expect(log).toHaveBeenCalledWith(expect.stringMatching(`voter ${voter.id} voted for ${candidate.id}`));
  });

  it('changes an existing vote (200, changed: true) and keeps one vote per voter', async () => {
    await openElection();
    const first = await candidateIn('CM-1', 1);
    const second = await candidateIn('CM-1', 2);
    const voter = await given.user(aVoter().inDistrict('CM-1'));
    await request(app).put('/me/vote').set(as(voter)).send({ candidateId: first.id });

    const res = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: second.id });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ candidateId: second.id, changed: true });
    const { rows } = await pool.query('SELECT candidate_id FROM votes WHERE voter_id = $1', [voter.id]);
    expect(rows).toEqual([{ candidate_id: second.id }]);
  });

  it('refuses a candidate from another district (403)', async () => {
    await openElection();
    const elsewhere = await candidateIn('CM-2');
    const voter = await given.user(aVoter().inDistrict('CM-1'));

    const res = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: elsewhere.id });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'candidate is not in your district' });
  });

  it('answers 404 for an unknown candidate', async () => {
    await openElection();
    const voter = await given.user(aVoter());

    const res = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: 999 });

    expect(res.status).toBe(404);
  });

  it('refuses to vote before the election opens (409)', async () => {
    await given.electionOpenedAt(new Date(Date.now() + HOUR));
    const candidate = await candidateIn('CM-1');
    const voter = await given.user(aVoter().inDistrict('CM-1'));

    const res = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: candidate.id });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'election is not open' });
  });

  it('refuses to vote when no election is configured (409)', async () => {
    const candidate = await candidateIn('CM-1');
    const voter = await given.user(aVoter().inDistrict('CM-1'));

    const res = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: candidate.id });

    expect(res.status).toBe(409);
  });

  it('refuses a commissioner (403) with its own message', async () => {
    await openElection();
    const commissioner = await given.user(aCommissioner());

    const res = await request(app).put('/me/vote').set(as(commissioner)).send({ candidateId: 1 });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'only voters can vote' });
  });

  it('requires a candidateId (400)', async () => {
    const voter = await given.user(aVoter());

    const res = await request(app).put('/me/vote').set(as(voter)).send({});

    expect(res.status).toBe(400);
  });

  it('requires a token (401)', async () => {
    const res = await request(app).put('/me/vote').send({ candidateId: 1 });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'authentication required' });
  });

  // --- new behaviour (Lab 07 requirement) ---

  it('refuses a vote once the district poll is closed (409)', async () => {
    await openElection();
    const candidate = await candidateIn('CM-1');
    const voter = await given.user(aVoter().inDistrict('CM-1'));
    await given.closedPoll('CM-1');

    const res = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: candidate.id });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'poll is closed' });
  });

  it('still accepts votes in a district whose poll is open while another is closed', async () => {
    await openElection();
    const candidate = await candidateIn('CM-1');
    const voter = await given.user(aVoter().inDistrict('CM-1'));
    await given.closedPoll('CM-2');

    const res = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: candidate.id });

    expect(res.status).toBe(201);
  });

  // --- surprising behaviour, recorded as-is (not fixed in this change) ---

  it('treats candidateId 0 as missing (400) because of a truthiness check', async () => {
    const voter = await given.user(aVoter());

    const res = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: 0 });

    expect(res.status).toBe(400);
  });

  it('answers 500 for a non-numeric candidateId (the database rejects it)', async () => {
    await openElection();
    const voter = await given.user(aVoter());
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: 'abc' });

    expect(res.status).toBe(500);
    error.mockRestore();
  });
});
