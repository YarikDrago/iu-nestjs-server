import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateUserVocabularyItemContentDto {
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
}
