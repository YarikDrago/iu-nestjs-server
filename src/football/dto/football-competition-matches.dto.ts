import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FootballMatchDto } from './football-match.dto';
import { FootballCompetitionMatchDto } from './football-competition-match.dto';

export class FootballCompetitionMatchesDto {
  @ValidateNested()
  @Type(() => FootballCompetitionMatchDto)
  competition!: FootballCompetitionMatchDto;

  @ValidateNested({ each: true })
  @Type(() => FootballMatchDto)
  matches!: FootballMatchDto[];
}
