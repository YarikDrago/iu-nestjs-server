import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateProductTypeDto {
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_]*$/)
  code!: string;

  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;
}
