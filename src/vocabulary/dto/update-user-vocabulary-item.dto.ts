import { IsEnum } from 'class-validator';
import { UserVocabularyItemStatus } from '../entities/user-vocabulary-item.entity';

export class UpdateUserVocabularyItemDto {
  @IsEnum(UserVocabularyItemStatus)
  status: UserVocabularyItemStatus;
}
