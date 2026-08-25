import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function trimOptionalString(value: unknown): unknown {
  const trimmed = trimString(value);
  return trimmed === '' ? undefined : trimmed;
}

export class CreateUserVocabularyItemDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sourceLanguageId!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  targetLanguageId!: number;

  @Transform(({ value }: { value: unknown }): unknown => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  sourceText!: string;

  @Transform(({ value }: { value: unknown }): unknown => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  targetText!: string;

  @Transform(({ value }: { value: unknown }): unknown =>
    trimOptionalString(value),
  )
  @IsOptional()
  @IsUrl()
  @MaxLength(1000)
  imageUrl?: string;

  @Transform(({ value }: { value: unknown }): unknown =>
    trimOptionalString(value),
  )
  @IsOptional()
  @IsUrl()
  @MaxLength(1000)
  imageSourceUrl?: string;

  @Transform(({ value }: { value: unknown }): unknown =>
    trimOptionalString(value),
  )
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageAltText?: string;
}
