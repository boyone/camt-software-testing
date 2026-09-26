// DEMO: the same feature as close-poll.spec.ts, seen through a real browser.
// Setup goes through the API (fast); only the part the user sees uses the page.
import { expect, test } from '@playwright/test';
import { COMMISSIONER, ElectionApi } from '../support/electionApi';

test('the results page shows scores only after the poll closes', async ({ page, request }) => {
  const api = new ElectionApi(request);
  const commissioner = await api.login(COMMISSIONER);
  const party = await api.createParty(commissioner, 'พรรคเจ้าพระยา');
  const candidate = await api.addCandidate(commissioner, 'BKK-1', party.id, 1);
  await api.vote(await api.newVoterIn('BKK-1'), candidate.id);

  await page.goto('/results.html');
  await page.getByLabel('เขตเลือกตั้ง').selectOption('BKK-1');

  await expect(page.getByRole('status')).toHaveText(/ยังไม่ปิดหีบ/);
  await expect(page.getByRole('row', { name: /พรรคเจ้าพระยา/ })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'คะแนน' })).toHaveCount(0);

  await request.post('/districts/BKK-1/close', { headers: { Authorization: `Bearer ${commissioner}` } });
  await page.reload();
  await page.getByLabel('เขตเลือกตั้ง').selectOption('BKK-1');

  await expect(page.getByRole('status')).toHaveText(/ปิดหีบแล้ว/);
  await expect(page.getByRole('columnheader', { name: 'คะแนน' })).toBeVisible();
  await expect(page.getByRole('row', { name: /พรรคเจ้าพระยา/ }).getByRole('cell').last()).toHaveText('1');
});
