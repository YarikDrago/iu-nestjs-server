import { IsInt, IsString, ValidateIf } from 'class-validator';

export class FootballMatchTeamDto {
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

  @ValidateIf((_, value) => value !== null)
  @IsString()
  crest!: string | null;
}
