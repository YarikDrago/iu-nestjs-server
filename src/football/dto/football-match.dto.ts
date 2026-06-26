import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsEnum,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FootballAreaDto } from './football-area.dto';
import { FootballSeasonDto } from './football-season.dto';
import { FootballMatchTeamDto } from './football-match-team.dto';
import { FootballCompetitionMatchDto } from './football-competition-match.dto';
import { MatchStatus } from '../../tournaments/entities/matches.entity';

class FootballMatchTimeScoreDto {
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  home!: number | null;

  @ValidateIf((_, value) => value !== null)
  @IsInt()
  away!: number | null;
}

class FootballScoreDto {
  @ValidateIf((_, value) => value !== null)
  @IsIn(['HOME_TEAM', 'AWAY_TEAM', 'DRAW'])
  winner: null | 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW';

  // @IsIn(['REGULAR', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'])
  // duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT';

  @ValidateNested()
  @Type(() => FootballMatchTimeScoreDto)
  fullTime!: FootballMatchTimeScoreDto;

  @ValidateNested()
  @Type(() => FootballMatchTimeScoreDto)
  halfTime!: FootballMatchTimeScoreDto;

  @ValidateNested()
  @Type(() => FootballMatchTimeScoreDto)
  regularTime?: FootballMatchTimeScoreDto;

  @ValidateNested()
  @Type(() => FootballMatchTimeScoreDto)
  extraTime?: FootballMatchTimeScoreDto;

  @ValidateNested()
  @Type(() => FootballMatchTimeScoreDto)
  penalties?: FootballMatchTimeScoreDto;
}

export class FootballMatchDto {
  @ValidateNested()
  @Type(() => FootballAreaDto)
  area?: FootballAreaDto;

  @ValidateNested()
  @Type(() => FootballCompetitionMatchDto)
  competition!: FootballCompetitionMatchDto;

  @ValidateNested()
  @Type(() => FootballSeasonDto)
  season!: FootballSeasonDto;

  @IsInt()
  id!: number;

  @IsString()
  utcDate!: string;

  @IsEnum(MatchStatus)
  status!: MatchStatus;

  @IsString()
  @IsNotEmpty()
  lastUpdated!: string;

  @ValidateNested()
  @Type(() => FootballMatchTeamDto)
  homeTeam!: FootballMatchTeamDto;

  @ValidateNested()
  @Type(() => FootballMatchTeamDto)
  awayTeam!: FootballMatchTeamDto;

  @ValidateNested()
  @Type(() => FootballScoreDto)
  score!: FootballScoreDto;
}
