import { FootballMatchDto } from '../../football/dto/football-match.dto';

export function calculateMatchScore(match: FootballMatchDto) {
  let homeScore: number | null = null;
  let awayScore: number | null = null;

  if (match.score.halfTime.home !== null) {
    homeScore = Math.max(
      match.score.halfTime.home,
      match.score.fullTime.home || 0,
    );
  }

  if (match.score.halfTime.away !== null) {
    awayScore = Math.max(
      match.score.halfTime.away,
      match.score.fullTime.away || 0,
    );
  }

  if (match.score.regularTime && match.score.extraTime) {
    homeScore =
      (match.score.regularTime?.home || 0) + (match.score.extraTime?.home || 0);
    awayScore =
      (match.score.regularTime?.away || 0) + (match.score.extraTime?.away || 0);
  }

  return { homeScore, awayScore };
}

export function getMaxScoreValue(
  apiScore: number | null,
  dbScore: number | null,
): number | null {
  if (apiScore === null) {
    return dbScore;
  }

  if (dbScore === null) {
    return apiScore;
  }

  return Math.max(apiScore, dbScore);
}
