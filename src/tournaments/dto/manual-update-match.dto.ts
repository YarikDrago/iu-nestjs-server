import { MatchStatus } from '../entities/matches.entity';
import { Allow } from 'class-validator';

export class ManualUpdateMatchDto {
  @Allow()
  homeTeam?: string | null;

  @Allow()
  home_team?: string | null;

  @Allow()
  awayTeam?: string | null;

  @Allow()
  away_team?: string | null;

  @Allow()
  startTime?: string | Date | null;

  @Allow()
  start_time?: string | Date | null;

  @Allow()
  status?: MatchStatus | null;

  @Allow()
  homeScore?: number | null;

  @Allow()
  home_score?: number | null;

  @Allow()
  awayScore?: number | null;

  @Allow()
  away_score?: number | null;

  //
  @Allow()
  hidePredictions?: boolean;

  @Allow()
  hide_predictions?: boolean;

  //
  @Allow()
  manualUpdated?: boolean;

  @Allow()
  manualUpdate?: boolean;

  @Allow()
  manual_updated?: boolean;

  @Allow()
  manual_update?: boolean;
}
