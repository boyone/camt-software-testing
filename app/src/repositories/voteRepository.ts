import { Pool } from 'pg';

export interface VoteRepository {
  /** Votes per candidate id in the district; candidates without votes are absent. */
  countByCandidate(districtId: string): Promise<Map<number, number>>;
}

export class PgVoteRepository implements VoteRepository {
  constructor(private readonly pool: Pool) {}

  async countByCandidate(districtId: string): Promise<Map<number, number>> {
    const { rows } = await this.pool.query<{ candidate_id: number; votes: string }>(
      `SELECT v.candidate_id, COUNT(*) AS votes
       FROM votes v JOIN candidates c ON c.id = v.candidate_id
       WHERE c.district_id = $1
       GROUP BY v.candidate_id`,
      [districtId],
    );
    return new Map(rows.map((r) => [r.candidate_id, Number(r.votes)]));
  }
}
