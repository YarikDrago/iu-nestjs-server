import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FootballCompetitionDto } from './football-competition.dto';
import { FootballMatchDto } from './football-match.dto';

export class FootballCompetitionMatchesDto {
  @ValidateNested()
  @Type(() => FootballCompetitionDto)
  competition!: FootballCompetitionDto;

  @ValidateNested({ each: true })
  @Type(() => FootballMatchDto)
  matches!: FootballMatchDto[];
}