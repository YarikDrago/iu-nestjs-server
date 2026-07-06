import { IsDateString, IsInt, IsOptional, IsUrl } from 'class-validator';

export class FootballSeasonDto {
  @IsInt()
  id!: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsInt()
  currentMatchday?: number;

  @IsOptional()
  @IsUrl({ require_tld: false })
  emblem?: string | null;

  // @ValidateIf((_, value) => value !== null && value !== undefined)
  // @IsString()
  // winner!: string | null;
}
