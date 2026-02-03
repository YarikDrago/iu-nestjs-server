import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FootballCompetitionDto } from './football-competition.dto';

export class FootballCompetitionsDto {
  @ValidateNested()
  @Type(() => FootballCompetitionDto)
  competitions!: FootballCompetitionDto[];
}
