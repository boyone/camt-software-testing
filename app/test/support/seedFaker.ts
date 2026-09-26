// setupFilesAfterEnv: same faker sequence in every test → a failure reproduces exactly.
import { faker, fakerTH } from '@faker-js/faker';

beforeEach(() => {
  faker.seed(20261003);
  fakerTH.seed(20261003);
});
