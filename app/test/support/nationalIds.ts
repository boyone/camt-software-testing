import { faker } from '@faker-js/faker';

/** A random Thai national id with a correct checksum digit. */
export function aValidNationalId(): string {
  const base = faker.string.numeric({ length: 12, allowLeadingZeros: false });
  const sum = [...base].reduce((acc, digit, i) => acc + Number(digit) * (13 - i), 0);
  return base + ((11 - (sum % 11)) % 10);
}
