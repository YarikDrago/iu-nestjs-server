import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive } from 'class-validator';
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
  @IsIn([UserVocabularyItemStatus.Active, UserVocabularyItemStatus.Archived])
  status?: UserVocabularyItemStatus;
}
