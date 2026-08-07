import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProductTypeDto {
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_]*$/)
  code?: string;

  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;
}
