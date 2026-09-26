import { whyBallotIsClosed } from '../../src/domain/ballotRules';

describe('whyBallotIsClosed', () => {
  const OPENS = new Date('2026-10-04T08:00:00+07:00');
  const NOON = new Date('2026-10-04T12:00:00+07:00');

  it('lets a voter vote once the election is open and the district poll is not closed', () => {
    const reason = whyBallotIsClosed({ now: NOON, electionOpensAt: OPENS, districtClosedAt: null });

    expect(reason).toBeNull();
  });

  it('refuses before the election opens', () => {
    const reason = whyBallotIsClosed({
      now: new Date('2026-10-04T07:59:59+07:00'),
      electionOpensAt: OPENS,
      districtClosedAt: null,
    });

    expect(reason).toBe('election is not open');
  });

  it('allows voting at the exact opening time', () => {
    expect(whyBallotIsClosed({ now: OPENS, electionOpensAt: OPENS, districtClosedAt: null })).toBeNull();
  });

  it('refuses when no election is configured', () => {
    const reason = whyBallotIsClosed({ now: NOON, electionOpensAt: null, districtClosedAt: null });

    expect(reason).toBe('election is not open');
  });

  it('refuses once the district poll is closed', () => {
    const reason = whyBallotIsClosed({
      now: NOON,
      electionOpensAt: OPENS,
      districtClosedAt: new Date('2026-10-04T11:00:00+07:00'),
    });

    expect(reason).toBe('poll is closed');
  });
});
