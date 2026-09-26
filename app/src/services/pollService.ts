import { Clock } from '../clock';
import { District } from '../domain/types';
import { ConflictError, NotFoundError } from '../errors';
import { CandidateRepository } from '../repositories/candidateRepository';
import { DistrictRepository } from '../repositories/districtRepository';
import { VoteRepository } from '../repositories/voteRepository';

export interface CandidateResult {
  number: number;
  firstName: string;
  lastName: string;
  partyName: string;
  /** only present once the poll is closed */
  votes?: number;
}

export interface DistrictResults {
  district: Pick<District, 'id' | 'province' | 'number'>;
  closed: boolean;
  closedAt: Date | null;
  candidates: CandidateResult[];
}

export class PollService {
  constructor(
    private readonly districts: DistrictRepository,
    private readonly candidates: CandidateRepository,
    private readonly votes: VoteRepository,
    private readonly clock: Clock,
  ) {}

  async close(districtId: string): Promise<{ districtId: string; closedAt: Date }> {
    const district = await this.findDistrict(districtId);
    if (district.closedAt) throw new ConflictError('poll is already closed');

    const closedAt = this.clock.now();
    await this.districts.markClosed(districtId, closedAt);
    return { districtId, closedAt };
  }

  async resultsFor(districtId: string): Promise<DistrictResults> {
    const { id, province, number, closedAt } = await this.findDistrict(districtId);
    const candidates = await this.candidates.findByDistrict(id);
    const tally = closedAt ? await this.votes.countByCandidate(id) : null;

    return {
      district: { id, province, number },
      closed: closedAt !== null,
      closedAt,
      candidates: candidates.map((c) => ({
        number: c.number,
        firstName: c.firstName,
        lastName: c.lastName,
        partyName: c.partyName,
        ...(tally && { votes: tally.get(c.id) ?? 0 }),
      })),
    };
  }

  private async findDistrict(districtId: string): Promise<District> {
    const district = await this.districts.findById(districtId);
    if (!district) throw new NotFoundError('district not found');
    return district;
  }
}
