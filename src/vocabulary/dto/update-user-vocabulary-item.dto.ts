import { IsIn } from 'class-validator';
import { UserVocabularyItemStatus } from '../entities/user-vocabulary-item.entity';

export class UpdateUserVocabularyItemDto {
  @IsIn([UserVocabularyItemStatus.Active, UserVocabularyItemStatus.Archived])
  status: UserVocabularyItemStatus;
}
