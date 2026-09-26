import { expect, test } from '@playwright/test';
import { COMMISSIONER, ElectionApi } from './support/electionApi';

test('the commission closes a district poll and its results become public', async ({ request }) => {
  const api = new ElectionApi(request);
  const commissioner = await api.login(COMMISSIONER);
  const doiSuthep = await api.createParty(commissioner, 'พรรคดอยสุเทพ');
  const maePing = await api.createParty(commissioner, 'พรรคแม่ปิง');
  const one = await api.addCandidate(commissioner, 'CM-3', doiSuthep.id, 1);
  const two = await api.addCandidate(commissioner, 'CM-3', maePing.id, 2);

  for (const candidateId of [one.id, one.id, two.id]) {
    const voter = await api.newVoterIn('CM-3');
    expect((await api.vote(voter, candidateId)).status()).toBe(201);
  }

  const before = await (await api.results('CM-3')).json();
  expect(before.closed).toBe(false);
  expect(before.candidates.every((c: object) => !('votes' in c))).toBe(true);

  const close = await request.post('/districts/CM-3/close', {
    headers: { Authorization: `Bearer ${commissioner}` },
  });
  expect(close.status()).toBe(200);

  const after = await (await api.results('CM-3')).json();
  expect(after).toMatchObject({
    closed: true,
    closedAt: expect.any(String),
    candidates: [
      { number: 1, partyName: 'พรรคดอยสุเทพ', votes: 2 },
      { number: 2, partyName: 'พรรคแม่ปิง', votes: 1 },
    ],
  });
});
