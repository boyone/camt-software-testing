# Lab 04

```ts
// builders.ts

// TEST DATA BUILDERS: a test states only the values it cares about;
// everything else gets a valid, faker-generated default.
import { fakerTH } from '@faker-js/faker';
import { hashPassword } from '../../src/auth/passwords';
import { Role } from '../../src/domain/types';
import { NewCandidate } from '../../src/repositories/candidateRepository';
import { NewParty } from '../../src/repositories/partyRepository';
import { NewUser } from '../../src/repositories/userRepository';
import { aValidNationalId } from './nationalIds';

export const DEFAULT_PASSWORD = 'password123';
// scrypt is slow on purpose — hash the default password once, not per user.
const DEFAULT_PASSWORD_HASH = hashPassword(DEFAULT_PASSWORD);

export type UserSpec = NewUser & { role: Role };

export class UserBuilder {
  private spec: UserSpec;

  constructor(role: Role) {
    this.spec = {
      nationalId: aValidNationalId(),
      passwordHash: DEFAULT_PASSWORD_HASH,
      firstName: fakerTH.person.firstName(),
      lastName: fakerTH.person.lastName(),
      address: fakerTH.location.streetAddress(),
      districtId: 'CM-1',
      role,
    };
  }

  inDistrict(districtId: string): this {
    this.spec.districtId = districtId;
    return this;
  }

  withNationalId(nationalId: string): this {
    this.spec.nationalId = nationalId;
    return this;
  }

  withPassword(password: string): this {
    this.spec.passwordHash = hashPassword(password);
    return this;
  }

  build(): UserSpec {
    return { ...this.spec };
  }
}

export const aVoter = () => new UserBuilder('VOTER');
export const aCommissioner = () => new UserBuilder('COMMISSIONER');
export const anAdmin = () => new UserBuilder('ADMIN');

export class PartyBuilder {
  private spec: NewParty = {
    name: `พรรค${fakerTH.person.lastName()}`,
    logoUrl: null,
    policy: fakerTH.lorem.sentence(),
  };

  named(name: string): this {
    this.spec.name = name;
    return this;
  }

  build(): NewParty {
    return { ...this.spec };
  }
}

export const aParty = () => new PartyBuilder();

export class CandidateBuilder {
  private spec: Omit<NewCandidate, 'partyId'> & { partyId?: number } = {
    districtId: 'CM-1',
    number: 1,
    firstName: fakerTH.person.firstName(),
    lastName: fakerTH.person.lastName(),
    photoUrl: null,
  };

  inDistrict(districtId: string): this {
    this.spec.districtId = districtId;
    return this;
  }

  forParty(partyId: number): this {
    this.spec.partyId = partyId;
    return this;
  }

  numbered(number: number): this {
    this.spec.number = number;
    return this;
  }

  build(): NewCandidate {
    if (this.spec.partyId === undefined) throw new Error('aCandidate() needs .forParty(partyId)');
    return { ...this.spec, partyId: this.spec.partyId };
  }
}

export const aCandidate = () => new CandidateBuilder();
```

```ts
// seedFacker.ts
// setupFilesAfterEnv: same faker sequence in every test → a failure reproduces exactly.
import { faker, fakerTH } from '@faker-js/faker';

beforeEach(() => {
  faker.seed(20261003);
  fakerTH.seed(20261003);
});
```

```ts
// jest.config.js
projects: [
    {
        setupFilesAfterEnv: ['<rootDir>/test/support/seedFaker.ts'],
    },
    {
        setupFilesAfterEnv: ['<rootDir>/test/support/seedFaker.ts'],
    }
]
```

```sh
cd app
npx tsx -e "import { aVoter, aParty } from './test/support/builders'; console.log(aVoter().inDistrict('CM-2').build(), aParty().build())"
```

```ts
// inMemoryRepositories.ts
// FAKES: working implementations without I/O, for unit tests.
// They must behave like the Pg versions (same ordering, same "not found" = null).
import { Candidate, District, Party, Role, User } from '../../src/domain/types';
import { CandidateRepository, NewCandidate } from '../../src/repositories/candidateRepository';
import { DistrictRepository } from '../../src/repositories/districtRepository';
import { NewParty, PartyRepository } from '../../src/repositories/partyRepository';
import { NewUser, UserRepository } from '../../src/repositories/userRepository';

export class InMemoryDistrictRepository implements DistrictRepository {
  constructor(private readonly districts: District[] = []) {}

  async findAll(): Promise<District[]> {
    return [...this.districts].sort((a, b) => a.province.localeCompare(b.province) || a.number - b.number);
  }

  async findById(id: string): Promise<District | null> {
    return this.districts.find((d) => d.id === id) ?? null;
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users: User[] = [];
  private nextId = 1;

  async findById(id: number): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async findByNationalId(nationalId: string): Promise<User | null> {
    return this.users.find((u) => u.nationalId === nationalId) ?? null;
  }

  async create(user: NewUser): Promise<User> {
    const created: User = { ...user, id: this.nextId++, role: 'VOTER' };
    this.users.push(created);
    return created;
  }

  async updateRole(id: number, role: Role): Promise<User | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    user.role = role;
    return user;
  }
}

export class InMemoryPartyRepository implements PartyRepository {
  private readonly parties: Party[] = [];
  private nextId = 1;

  async findAll(): Promise<Party[]> {
    return [...this.parties].sort((a, b) => a.name.localeCompare(b.name));
  }

  async findById(id: number): Promise<Party | null> {
    return this.parties.find((p) => p.id === id) ?? null;
  }

  async findByName(name: string): Promise<Party | null> {
    return this.parties.find((p) => p.name === name) ?? null;
  }

  async create(party: NewParty): Promise<Party> {
    const created = { ...party, id: this.nextId++ };
    this.parties.push(created);
    return created;
  }
}

export class InMemoryCandidateRepository implements CandidateRepository {
  private readonly candidates: Candidate[] = [];
  private nextId = 1;

  constructor(private readonly parties: PartyRepository) {}

  async findByDistrict(districtId: string): Promise<Candidate[]> {
    return this.candidates.filter((c) => c.districtId === districtId).sort((a, b) => a.number - b.number);
  }

  async findByParty(partyId: number): Promise<Candidate[]> {
    return this.candidates
      .filter((c) => c.partyId === partyId)
      .sort((a, b) => a.districtId.localeCompare(b.districtId) || a.number - b.number);
  }

  async create(candidate: NewCandidate): Promise<Candidate> {
    const party = await this.parties.findById(candidate.partyId);
    if (!party) throw new Error(`fake: party ${candidate.partyId} does not exist (foreign key)`);
    const created = { ...candidate, id: this.nextId++, partyName: party.name };
    this.candidates.push(created);
    return created;
  }
}
```

```ts
// nationalIds.ts
import { faker } from '@faker-js/faker';

/** A random Thai national id with a correct checksum digit. */
export function aValidNationalId(): string {
  const base = faker.string.numeric({ length: 12, allowLeadingZeros: false });
  const sum = [...base].reduce((acc, digit, i) => acc + Number(digit) * (13 - i), 0);
  return base + ((11 - (sum % 11)) % 10);
}
```