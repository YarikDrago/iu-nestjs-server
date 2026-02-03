import { IsDateString, IsInt, IsOptional } from 'class-validator';

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

  // @ValidateIf((_, value) => value !== null && value !== undefined)
  // @IsString()
  // winner!: string | null;
}
