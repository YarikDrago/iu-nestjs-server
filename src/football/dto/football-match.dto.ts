import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FootballAreaDto } from './football-area.dto';
import { FootballSeasonDto } from './football-season.dto';
import { FootballCompetitionDto } from './football-competition.dto';
import { FootballTeamDto } from './football-team.dto';

export class FootballMatchDto {
  @ValidateNested()
  @Type(() => FootballAreaDto)
  area?: FootballAreaDto;

  @ValidateNested()
  @Type(() => FootballCompetitionDto)
  competition!: FootballCompetitionDto;

  @ValidateNested()
  @Type(() => FootballSeasonDto)
  season!: FootballSeasonDto;

  @IsInt()
  id!: number;

  @IsString()
  utcDate!: string;

  @IsString()
  status!: string;

  @IsString()
  @IsNotEmpty()
  lastUpdated!: string;

  @ValidateNested()
  @Type(() => FootballTeamDto)
  homeTeam!: FootballTeamDto;

  @ValidateNested()
  @Type(() => FootballTeamDto)
  awayTeam!: FootballTeamDto;

  @ValidateNested()
  @Type(() => FootballScoreDto)
  score!: FootballScoreDto;
}

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
