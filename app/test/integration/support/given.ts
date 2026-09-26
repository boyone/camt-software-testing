// CREATION METHODS: insert builder output through the real repositories.
import { Pool } from 'pg';
import { TokenService } from '../../../src/auth/tokenService';
import { Candidate, Party, User } from '../../../src/domain/types';
import { PgCandidateRepository } from '../../../src/repositories/candidateRepository';
import { PgPartyRepository } from '../../../src/repositories/partyRepository';
import { PgUserRepository } from '../../../src/repositories/userRepository';
import { aParty, aVoter, CandidateBuilder, PartyBuilder, UserBuilder } from '../../support/builders';

export function givenFor(pool: Pool) {
  const users = new PgUserRepository(pool);
  const parties = new PgPartyRepository(pool);
  const candidates = new PgCandidateRepository(pool);

  return {
    async user(builder: UserBuilder = aVoter()): Promise<User> {
      const { role, ...newUser } = builder.build();
      const created = await users.create(newUser);
      return role === 'VOTER' ? created : (await users.updateRole(created.id, role))!;
    },

    async party(builder: PartyBuilder = aParty()): Promise<Party> {
      return parties.create(builder.build());
    },

    async candidate(builder: CandidateBuilder): Promise<Candidate> {
      return candidates.create(builder.build());
    },

    async electionOpenedAt(opensAt: Date): Promise<void> {
      await pool.query('INSERT INTO election (id, opens_at) VALUES (1, $1)', [opensAt]);
    },
  };
}

/** Skip the login round-trip: sign a token with the app's own TokenService. */
export function authHeaderFor(tokens: TokenService, user: User): { Authorization: string } {
  const token = tokens.issue({ userId: user.id, role: user.role, districtId: user.districtId });
  return { Authorization: `Bearer ${token}` };
}
