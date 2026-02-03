import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class FootballAreaDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  // @ValidateIf((_, value) => value !== null && value !== undefined)
  // @IsString()
  // @IsNotEmpty()
  // flag!: string | null;
}
