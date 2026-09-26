import { expect, test } from '@playwright/test';
import { COMMISSIONER, ElectionApi } from './support/electionApi';

// Each e2e test uses its own district: the e2e database is shared within a run.
test('a new voter sees the candidates of their own district', async ({ request }) => {
  const api = new ElectionApi(request);
  const commissioner = await api.login(COMMISSIONER);
  const party = await api.createParty(commissioner, 'พรรคลำพูนก้าวหน้า');
  await api.addCandidate(commissioner, 'LPN-1', party.id, 1);

  const voter = await api.newVoterIn('LPN-1');
  const res = await api.myCandidates(voter);

  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toEqual([
    expect.objectContaining({ number: 1, party: 'พรรคลำพูนก้าวหน้า', selected: false }),
  ]);
});
