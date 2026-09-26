import { beforeEach, describe, expect, it } from 'vitest';
import { Clock } from '../../src/clock';
import { ConflictError, NotFoundError } from '../../src/errors';
import { PollService } from '../../src/services/pollService';
import {
  InMemoryCandidateRepository,
  InMemoryDistrictRepository,
  InMemoryPartyRepository,
  InMemoryVoteRepository,
} from '../support/inMemoryRepositories';

describe('PollService', () => {
  const FIVE_PM = new Date('2026-10-04T17:00:00+07:00');
  const clock: Clock = { now: () => FIVE_PM }; // STUB: time is an input we control

  let districts: InMemoryDistrictRepository;
  let parties: InMemoryPartyRepository;
  let candidates: InMemoryCandidateRepository;
  let votes: InMemoryVoteRepository;
  let polls: PollService;

  beforeEach(() => {
    districts = new InMemoryDistrictRepository([{ id: 'CM-1', province: 'เชียงใหม่', number: 1, closedAt: null }]);
    parties = new InMemoryPartyRepository();
    candidates = new InMemoryCandidateRepository(parties);
    votes = new InMemoryVoteRepository();
    polls = new PollService(districts, candidates, votes, clock);
  });

  async function candidateNumbered(number: number) {
    const party = await parties.create({ name: `พรรค${number}`, logoUrl: null, policy: '-' });
    return candidates.create({
      districtId: 'CM-1',
      partyId: party.id,
      number,
      firstName: 'ผู้สมัคร',
      lastName: `${number}`,
      photoUrl: null,
    });
  }

  describe('close', () => {
    it('closes the poll at the time given by the clock', async () => {
      const closed = await polls.close('CM-1');

      expect(closed).toEqual({ districtId: 'CM-1', closedAt: FIVE_PM });
      expect((await districts.findById('CM-1'))?.closedAt).toEqual(FIVE_PM);
    });

    it('refuses to close a poll that is already closed', async () => {
      await polls.close('CM-1');

      await expect(polls.close('CM-1')).rejects.toThrow(ConflictError);
    });

    it('rejects an unknown district', async () => {
      await expect(polls.close('XX-9')).rejects.toThrow(NotFoundError);
    });
  });

  describe('resultsFor', () => {
    it('hides the votes while the poll is open', async () => {
      const one = await candidateNumbered(1);
      votes.cast(101, 'CM-1', one.id);

      const results = await polls.resultsFor('CM-1');

      expect(results.closed).toBe(false);
      expect(results.candidates[0]).not.toHaveProperty('votes');
    });

    it('shows every candidate with their votes once closed, zero included', async () => {
      const one = await candidateNumbered(1);
      await candidateNumbered(2);
      votes.cast(101, 'CM-1', one.id);
      votes.cast(102, 'CM-1', one.id);
      await polls.close('CM-1');

      const results = await polls.resultsFor('CM-1');

      expect(results).toMatchObject({
        closed: true,
        closedAt: FIVE_PM,
        candidates: [
          { number: 1, votes: 2 },
          { number: 2, votes: 0 },
        ],
      });
    });
  });
});
