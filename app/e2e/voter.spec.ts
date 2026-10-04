import { expect, test } from '@playwright/test';
import { ADMIN, COMMISSIONER, ElectionApi, uniqueNationalId } from './support/electionApi';

// What a VOTER can do: registering makes you one, and a voter reads their
// ballot (GET /me/candidates) and votes (PUT /me/vote) — nothing more.
// Each test uses its own district: the e2e database is shared within a run.

test('registering creates a VOTER account that can log in', async ({ request }) => {
  const api = new ElectionApi(request);
  const credentials = { nationalId: uniqueNationalId(), password: 'voter1234' };

  const res = await request.post('/auth/register', {
    data: { ...credentials, firstName: 'สมชาย', lastName: 'ใจดี', address: 'CAMT', districtId: 'BKK-1' },
  });

  expect(res.status()).toBe(201);
  const user = await res.json();
  expect(user).toMatchObject({ nationalId: credentials.nationalId, districtId: 'BKK-1', role: 'VOTER' });
  expect(user).not.toHaveProperty('passwordHash');
  expect(await api.login(credentials)).toEqual(expect.any(String));
});

test('a voter votes, sees their choice on the ballot, then changes it', async ({ request }) => {
  const api = new ElectionApi(request);
  const commissioner = await api.login(COMMISSIONER);
  const riverside = await api.createParty(commissioner, 'พรรคริมน้ำ');
  const oldTown = await api.createParty(commissioner, 'พรรคเมืองเก่า');
  const one = await api.addCandidate(commissioner, 'BKK-2', riverside.id, 1);
  const two = await api.addCandidate(commissioner, 'BKK-2', oldTown.id, 2);
  const voter = await api.newVoterIn('BKK-2');

  const first = await api.vote(voter, one.id);
  expect(first.status()).toBe(201);
  expect(await first.json()).toMatchObject({ candidateId: one.id, changed: false, votedAt: expect.any(String) });
  expect(await (await api.myCandidates(voter)).json()).toEqual([
    expect.objectContaining({ id: one.id, selected: true }),
    expect.objectContaining({ id: two.id, selected: false }),
  ]);

  const change = await api.vote(voter, two.id);
  expect(change.status()).toBe(200);
  expect(await change.json()).toMatchObject({ candidateId: two.id, changed: true });
  expect(await (await api.myCandidates(voter)).json()).toEqual([
    expect.objectContaining({ id: one.id, selected: false }),
    expect.objectContaining({ id: two.id, selected: true }),
  ]);
});

test('a voter cannot vote for a candidate in another district', async ({ request }) => {
  const api = new ElectionApi(request);
  const commissioner = await api.login(COMMISSIONER);
  const party = await api.createParty(commissioner, 'พรรคแม่ริม');
  const elsewhere = await api.addCandidate(commissioner, 'CM-2', party.id, 1);
  const voter = await api.newVoterIn('BKK-1');

  const res = await api.vote(voter, elsewhere.id);

  expect(res.status()).toBe(403);
  expect(await res.json()).toEqual({ error: 'candidate is not in your district' });
});

test('a voter cannot use commission or admin routes', async ({ request }) => {
  const api = new ElectionApi(request);
  const voter = await api.newVoterIn('BKK-1');
  const headers = { Authorization: `Bearer ${voter}` };

  const party = await request.post('/parties', { headers, data: { name: 'พรรคของผู้มีสิทธิ', policy: 'ไม่ควรสร้างได้' } });
  const candidate = await request.post('/districts/BKK-1/candidates', {
    headers,
    data: { partyId: 1, number: 9, firstName: 'ไม่ควร', lastName: 'สร้างได้' },
  });
  const role = await request.patch('/admin/users/1/role', { headers, data: { role: 'COMMISSIONER' } });

  expect([party.status(), candidate.status(), role.status()]).toEqual([403, 403, 403]);
});

test('only voters can vote', async ({ request }) => {
  const api = new ElectionApi(request);
  const admin = await api.login(ADMIN);

  const res = await api.vote(admin, 1);

  expect(res.status()).toBe(403);
  expect(await res.json()).toEqual({ error: 'only voters can vote' });
});

test('the ballot and voting need a signed-in user', async ({ request }) => {
  const ballot = await request.get('/me/candidates');
  const vote = await request.put('/me/vote', { data: { candidateId: 1 } });

  expect([ballot.status(), vote.status()]).toEqual([401, 401]);
});
