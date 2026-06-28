import { Matches } from '../entities/matches.entity';

export type MatchResponseDto = Matches & {
  hide_predictions: boolean;
  manualUpdated: boolean;
};
