import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FootballAreaDto } from './football-area.dto';
import { FootballSeasonDto } from './football-season.dto';

export class FootballTournamentGeneralDto {
  @IsInt()
  id!: number;

  @ValidateNested()
  @Type(() => FootballAreaDto)
  // area!: FootballAreaDto;
  area?: FootballAreaDto;

  @IsString()
  @IsNotEmpty()
  name!: string;
  // name?: string;

  // @IsString()
  // @IsNotEmpty()
  // // code!: string;
  // code?: string;

  // @IsString()
  // @IsNotEmpty()
  // // type!: string;
  // type?: string;

  // @IsOptional()
  // @IsUrl({ require_tld: false })
  // emblem?: string;
  //
  // @IsOptional()
  // @IsString()
  // plan?: string;
  //
  @IsOptional()
  @ValidateNested()
  @Type(() => FootballSeasonDto)
  currentSeason!: FootballSeasonDto;
  //
  // @IsOptional()
  // @IsInt()
  // numberOfAvailableSeasons?: number;
  //
  // @IsDateString()
  // // lastUpdated!: string;
  // lastUpdated?: string;
  //
  // @IsOptional()
  // @IsArray()
  // @ValidateNested({ each: true })
  // @Type(() => FootballSeasonDto)
  // seasons?: FootballSeasonDto[];
}
