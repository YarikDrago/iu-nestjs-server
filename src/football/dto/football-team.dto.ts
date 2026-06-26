import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class FootballTeamAreaDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  flag?: string | null;
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

  @IsOptional()
  @IsString()
  emblem?: string | null;
}

class FootballTeamCoachContractDto {
  @IsOptional()
  @IsDateString()
  start?: string | null;

  @IsOptional()
  @IsDateString()
  until?: string | null;
}

class FootballTeamCoachDto {
  @IsOptional()
  @IsInt()
  id?: number | null;

  @IsOptional()
  @IsString()
  firstName?: string | null;

  @IsOptional()
  @IsString()
  lastName?: string | null;

  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  @IsOptional()
  @IsString()
  nationality?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => FootballTeamCoachContractDto)
  contract?: FootballTeamCoachContractDto | null;
}

class FootballTeamSquadMemberDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  position?: string | null;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  @IsOptional()
  @IsString()
  nationality?: string | null;
}

export class FootballTeamDto {
  @ValidateNested()
  @Type(() => FootballTeamAreaDto)
  area!: FootballTeamAreaDto;

  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  shortName?: string | null;

  @IsOptional()
  @IsString()
  tla?: string | null;

  @IsOptional()
  @IsString()
  crest?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  website?: string | null;

  @IsOptional()
  @IsInt()
  founded?: number | null;

  @IsOptional()
  @IsString()
  clubColors?: string | null;

  @IsOptional()
  @IsString()
  venue?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FootballTeamRunningCompetitionDto)
  runningCompetitions?: FootballTeamRunningCompetitionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => FootballTeamCoachDto)
  coach?: FootballTeamCoachDto | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FootballTeamSquadMemberDto)
  squad?: FootballTeamSquadMemberDto[];

  @IsOptional()
  @IsArray()
  staff?: unknown[];

  @IsOptional()
  @IsDateString()
  lastUpdated?: string;
}

export type FootballTeamListDto = FootballTeamDto[];
