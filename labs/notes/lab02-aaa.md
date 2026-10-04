# Lab 02

```ts
// thaiNationalId.test.ts
import { isValidThaiNationalId } from '../../src/domain/thaiNationalId';

describe('isValidThaiNationalId', () => {
  it('accepts an id whose last digit matches the checksum', () => {
    const id = '1509900000017';

    const valid = isValidThaiNationalId(id);

    expect(valid).toBe(true);
  });

  it.each(['1100000000016', '1100000000024'])('accepts another valid id %s', (id) => {
    expect(isValidThaiNationalId(id)).toBe(true);
  });

  it('rejects an id with a wrong checksum digit', () => {
    expect(isValidThaiNationalId('1509900000018')).toBe(false);
  });

  it.each([
    ['empty', ''],
    ['12 digits', '150990000001'],
    ['14 digits', '15099000000170'],
    ['a letter', '150990000001x'],
    ['all letters', 'abcdefghijklm'],
    ['dashes', '1-5099-00000-01-7'],
  ])('rejects a malformed id (%s)', (_case, id) => {
    expect(isValidThaiNationalId(id)).toBe(false);
  });
});
```

```ts
// config.test.ts
import { loadConfig } from '../../src/config';

describe('loadConfig', () => {
  it('falls back to local development defaults when nothing is set', () => {
    const env = {};

    const config = loadConfig(env);

    expect(config).toEqual({
      port: 3000,
      databaseUrl: 'postgres://election:election@localhost:5432/election_dev',
      jwtSecret: 'dev-secret',
    });
  });

  it('reads every setting from the given environment', () => {
    const env = { PORT: '8080', DATABASE_URL: 'postgres://db/prod', JWT_SECRET: 's3cret' };

    const config = loadConfig(env);

    expect(config).toEqual({ port: 8080, databaseUrl: 'postgres://db/prod', jwtSecret: 's3cret' });
  });
});
```

```ts
// passwords.test.ts
import { hashPassword, verifyPassword } from '../../src/auth/passwords';

describe('hashPassword', () => {
  it('never returns the plain-text password', () => {
    const hash = hashPassword('voter1234');

    expect(hash).not.toContain('voter1234');
  });

  it('gives a different hash each time for the same password (random salt)', () => {
    const first = hashPassword('voter1234');

    const second = hashPassword('voter1234');

    expect(second).not.toBe(first);
  });
});

describe('verifyPassword', () => {
  const stored = hashPassword('voter1234');

  it('accepts the password that was hashed', () => {
    expect(verifyPassword('voter1234', stored)).toBe(true);
  });

  it('rejects a different password', () => {
    expect(verifyPassword('voter12345', stored)).toBe(false);
  });

  it.each(['garbage', '', 'bcrypt$abc$def', 'scrypt$onlysalt'])(
    'rejects a malformed stored hash "%s" without throwing',
    (malformed) => {
      expect(verifyPassword('voter1234', malformed)).toBe(false);
    },
  );
});
```

```ts
// publicUser.test.ts
import { toPublicUser } from '../../src/services/accountService';

describe('toPublicUser', () => {
  it('drops the password hash and keeps everything else', () => {
    const user = {
      id: 7,
      nationalId: '1509900000017',
      passwordHash: 'scrypt$salt$hash',
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      address: 'CAMT',
      districtId: 'CM-1',
      role: 'VOTER' as const,
    };

    const publicUser = toPublicUser(user);

    expect(publicUser).not.toHaveProperty('passwordHash');
    expect(publicUser).toEqual({
      id: 7,
      nationalId: '1509900000017',
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      address: 'CAMT',
      districtId: 'CM-1',
      role: 'VOTER',
    });
  });
});
```