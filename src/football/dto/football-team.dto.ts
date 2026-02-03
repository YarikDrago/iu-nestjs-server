import { IsInt, IsString, ValidateIf } from 'class-validator';

export class FootballTeamDto {
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  id!: number | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  name!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  shortName!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  tla!: string | null;

  // @IsString()
  // @IsNotEmpty()
  // crest!: string;
}
