import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class FootballCompetitionDto {
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

  // @IsOptional()
  // @IsUrl({ require_tld: false })
  // emblem?: string;
}
