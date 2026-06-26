import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class FootballTeamDetailsAreaDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  flag!: string | null;
}

class FootballTeamRunningCompetitionDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  emblem!: string | null;
}

class FootballTeamCoachContractDto {
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  start!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  until!: string | null;
}

class FootballTeamCoachDto {
  @IsInt()
  id!: number;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  firstName!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  lastName!: string | null;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  dateOfBirth!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  nationality!: string | null;

  @ValidateNested()
  @Type(() => FootballTeamCoachContractDto)
  contract!: FootballTeamCoachContractDto;
}

class FootballTeamSquadMemberDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  position!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  dateOfBirth!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  nationality!: string | null;
}

export class FootballTeamDetailsDto {
  @ValidateNested()
  @Type(() => FootballTeamDetailsAreaDto)
  area!: FootballTeamDetailsAreaDto;

  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  shortName!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  tla!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  crest!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  address!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  website!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsInt()
  founded!: number | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  clubColors!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  venue!: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FootballTeamRunningCompetitionDto)
  runningCompetitions!: FootballTeamRunningCompetitionDto[];

  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => FootballTeamCoachDto)
  coach!: FootballTeamCoachDto | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FootballTeamSquadMemberDto)
  squad!: FootballTeamSquadMemberDto[];

  @IsArray()
  staff!: unknown[];

  @IsDateString()
  lastUpdated!: string;
}

export type FootballTeamDetailsListDto = FootballTeamDetailsDto[];
