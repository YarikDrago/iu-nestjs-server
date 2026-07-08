import { MatchStatus } from '../entities/matches.entity';
import { resolveAutomaticMatchStatus } from './match-status.helper';

describe('resolveAutomaticMatchStatus', () => {
  it('keeps finished matches finished for automatic updates', () => {
    expect(
      resolveAutomaticMatchStatus(MatchStatus.IN_PLAY, MatchStatus.FINISHED),
    ).toBe(MatchStatus.FINISHED);
  });

  it('keeps in-play matches from returning to scheduled', () => {
    expect(
      resolveAutomaticMatchStatus(MatchStatus.SCHEDULED, MatchStatus.IN_PLAY),
    ).toBe(MatchStatus.IN_PLAY);
  });

  it('keeps in-play matches from returning to timed', () => {
    expect(
      resolveAutomaticMatchStatus(MatchStatus.TIMED, MatchStatus.IN_PLAY),
    ).toBe(MatchStatus.IN_PLAY);
  });

  it('allows other automatic status changes', () => {
    expect(
      resolveAutomaticMatchStatus(MatchStatus.FINISHED, MatchStatus.IN_PLAY),
    ).toBe(MatchStatus.FINISHED);
  });
});
