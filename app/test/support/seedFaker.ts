// Vitest "setupFiles" run inside the test context, so hooks here apply to every test:
// same faker sequence in every test → a failure reproduces exactly.
import { beforeEach } from 'vitest';
import { faker, fakerTH } from '@faker-js/faker';

beforeEach(() => {
  faker.seed(20261003);
  fakerTH.seed(20261003);
});
