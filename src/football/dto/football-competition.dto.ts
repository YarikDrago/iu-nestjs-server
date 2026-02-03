import { IsInt, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { FootballAreaDto } from './football-area.dto';
import { Type } from 'class-transformer';
import { FootballSeasonDto } from './football-season.dto';

export class FootballCompetitionDto {
  @IsInt()
  id!: number;

  @ValidateNested()
  @Type(() => FootballAreaDto)
  area!: FootballAreaDto;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  // @IsOptional()
  // @IsUrl({ require_tld: false })
  // emblem?: string;

  @ValidateNested()
  @Type(() => FootballSeasonDto)
  currentSeason!: FootballSeasonDto;

  @IsInt()
  numberOfAvailableSeasons!: number;

  @IsString()
  lastUpdated!: string;
}
