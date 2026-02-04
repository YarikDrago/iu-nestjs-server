import { IsInt, IsNotEmpty, IsString } from 'class-validator';

/* This DTO is used in /competitions/:id/matches endpoint.
 * It is different from FootballCompetitionDto */
export class FootballCompetitionMatchDto {
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
}
