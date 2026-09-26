export interface BallotState {
  now: Date;
  /** null when no election has been configured */
  electionOpensAt: Date | null;
  /** null while the voter's district poll is open */
  districtClosedAt: Date | null;
}

/** Why a voter cannot cast or change a ballot right now, or null if they can. */
export function whyBallotIsClosed({ now, electionOpensAt, districtClosedAt }: BallotState): string | null {
  if (!electionOpensAt || now < electionOpensAt) return 'election is not open';
  if (districtClosedAt) return 'poll is closed';
  return null;
}
