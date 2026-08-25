import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { UserVocabularyItemStatus } from '../entities/user-vocabulary-item.entity';

export class GetUserVocabularyItemsDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @IsPositive()
  sourceLanguageId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @IsPositive()
  targetLanguageId?: number;

  @IsOptional()
  @IsEnum(UserVocabularyItemStatus)
  status?: UserVocabularyItemStatus;
}
