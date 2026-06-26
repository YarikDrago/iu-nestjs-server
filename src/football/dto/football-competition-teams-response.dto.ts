import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { FootballCompetitionMatchDto } from './football-competition-match.dto';
import { FootballSeasonDto } from './football-season.dto';
import { FootballTeamDto } from './football-team.dto';

export class FootballCompetitionTeamsResponseDto {
  @IsOptional()
  @IsInt()
  count?: number;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @ValidateNested()
  @Type(() => FootballCompetitionMatchDto)
  competition!: FootballCompetitionMatchDto;

  @ValidateNested()
  @Type(() => FootballSeasonDto)
  season!: FootballSeasonDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FootballTeamDto)
  teams!: FootballTeamDto[];
}
