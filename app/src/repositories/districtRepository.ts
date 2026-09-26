import { Pool } from 'pg';
import { District } from '../domain/types';

export interface DistrictRepository {
  findAll(): Promise<District[]>;
  findById(id: string): Promise<District | null>;
  markClosed(id: string, closedAt: Date): Promise<void>;
}

const COLUMNS = `id, province, number, closed_at AS "closedAt"`;

export class PgDistrictRepository implements DistrictRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<District[]> {
    const { rows } = await this.pool.query<District>(`SELECT ${COLUMNS} FROM districts ORDER BY province, number`);
    return rows;
  }

  async findById(id: string): Promise<District | null> {
    const { rows } = await this.pool.query<District>(`SELECT ${COLUMNS} FROM districts WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  async markClosed(id: string, closedAt: Date): Promise<void> {
    await this.pool.query(`UPDATE districts SET closed_at = $2 WHERE id = $1`, [id, closedAt]);
  }
}
