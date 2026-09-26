// CONTRACT TEST for a fake: one suite, run against the fake AND the real repository.
// If InMemoryPartyRepository ever drifts from PgPartyRepository, this fails.
import { Pool } from 'pg';
import { PartyRepository, PgPartyRepository } from '../../src/repositories/partyRepository';
import { InMemoryPartyRepository } from '../support/inMemoryRepositories';
import { createTestPool, truncateAll } from './support/database';

let pool: Pool;

beforeAll(() => {
  pool = createTestPool();
});

afterAll(async () => {
  await pool.end();
});

describe.each([
  ['InMemoryPartyRepository', async (): Promise<PartyRepository> => new InMemoryPartyRepository()],
  [
    'PgPartyRepository',
    async (): Promise<PartyRepository> => {
      await truncateAll(pool);
      return new PgPartyRepository(pool);
    },
  ],
])('%s', (_name, makeRepository) => {
  let parties: PartyRepository;

  beforeEach(async () => {
    parties = await makeRepository();
  });

  it('finds a created party by id and by name', async () => {
    const created = await parties.create({ name: 'พรรคแม่ปิง', logoUrl: null, policy: 'แก้ฝุ่น' });

    expect(await parties.findById(created.id)).toEqual(created);
    expect(await parties.findByName('พรรคแม่ปิง')).toEqual(created);
  });

  it('returns null for a party that does not exist', async () => {
    expect(await parties.findById(999)).toBeNull();
    expect(await parties.findByName('ไม่มีพรรคนี้')).toBeNull();
  });

  it('lists parties ordered by name', async () => {
    await parties.create({ name: 'พรรคแม่ปิง', logoUrl: null, policy: '-' });
    await parties.create({ name: 'พรรคดอยสุเทพ', logoUrl: null, policy: '-' });

    const names = (await parties.findAll()).map((p) => p.name);

    expect(names).toEqual(['พรรคดอยสุเทพ', 'พรรคแม่ปิง']);
  });
});
