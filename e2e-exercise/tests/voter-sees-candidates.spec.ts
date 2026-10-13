import { expect, test } from '@playwright/test';
import { randomThaiNationalId } from './support/thaiNationalId';

test('a voter registers and then sees the candidates of their district', async ({ request }) => {
  const voter = {
    nationalId: randomThaiNationalId(),
    password: 'voter1234',
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    address: '239 ถนนห้วยแก้ว',
    districtId: 'CM-2',
  };

  // 1st step: voter goes to register
  const registerRes = await test.step('voter registers', () =>
    request.post('/auth/register', { data: voter }),
  );

  // 2nd step: assert the response
  await test.step('registration succeeds as a VOTER', async () => {
    expect(registerRes.status(), await registerRes.text()).toBe(201);
    const user = await registerRes.json();
    expect(user).toEqual({
      id: expect.any(Number),
      nationalId: voter.nationalId,
      firstName: voter.firstName,
      lastName: voter.lastName,
      address: voter.address,
      districtId: 'CM-2',
      role: 'VOTER',
    });
    expect(user).not.toHaveProperty('passwordHash');
  });

  // 3rd step: voter logs in, then asks the election API for the candidates
  const candidatesRes = await test.step('voter requests their candidates', async () => {
    const loginRes = await request.post('/auth/login', {
      data: { nationalId: voter.nationalId, password: voter.password },
    });
    expect(loginRes.status(), await loginRes.text()).toBe(200);
    const { token } = await loginRes.json();

    return request.get('/me/candidates', { headers: { Authorization: `Bearer ${token}` } });
  });

  // 4th step: assert the candidates (the ones from test-data.sql)
  await test.step('voter sees the CM-2 candidates', async () => {
    expect(candidatesRes.status(), await candidatesRes.text()).toBe(200);
    expect(await candidatesRes.json()).toEqual([
      { id: expect.any(Number), number: 1, name: 'อนันต์ ศรีสุข', party: 'พรรคดอยสุเทพ', selected: false },
      { id: expect.any(Number), number: 2, name: 'มาลี วงศ์คำ', party: 'พรรคแม่ปิง', selected: false },
    ]);
  });
});
