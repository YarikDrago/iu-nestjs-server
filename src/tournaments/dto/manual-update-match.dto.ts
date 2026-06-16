import { MatchStatus } from '../entities/matches.entity';

export class ManualUpdateMatchDto {
  homeTeam?: string | null;
  home_team?: string | null;
  awayTeam?: string | null;
  away_team?: string | null;
  startTime?: string | Date | null;
  start_time?: string | Date | null;
  status?: MatchStatus | null;
  homeScore?: number | null;
  home_score?: number | null;
  awayScore?: number | null;
  away_score?: number | null;
  hidePredictions?: boolean;
  hide_predictions?: boolean;
}
