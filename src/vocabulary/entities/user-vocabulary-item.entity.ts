import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Language } from '../../languages/entities/language.entity';
import { User } from '../../users/entities/user.entity';
import { Concept } from './concept.entity';

export enum UserVocabularyItemStatus {
  Active = 'active',
  Archived = 'archived',
  Deleted = 'deleted',
}

@Entity({ name: 'user_vocabulary_items' })
@Index(
  'UQ_user_vocabulary_items_user_concept_languages',
  ['user_id', 'concept_id', 'source_language_id', 'target_language_id'],
  { unique: true },
)
@Index('IDX_user_vocabulary_items_user_id', ['user_id'])
@Index('IDX_user_vocabulary_items_concept_id', ['concept_id'])
@Index('IDX_user_vocabulary_items_source_language_id', ['source_language_id'])
@Index('IDX_user_vocabulary_items_target_language_id', ['target_language_id'])
@Index('IDX_user_vocabulary_items_status', ['status'])
export class UserVocabularyItem {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  user_id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'concept_id', type: 'bigint' })
  concept_id: number;

  @ManyToOne(() => Concept, (concept) => concept.user_vocabulary_items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'concept_id' })
  concept: Concept;

  @Column({ name: 'source_language_id', type: 'bigint' })
  source_language_id: number;

  @ManyToOne(() => Language, { nullable: false })
  @JoinColumn({ name: 'source_language_id' })
  source_language: Language;

  @Column({ name: 'target_language_id', type: 'bigint' })
  target_language_id: number;

  @ManyToOne(() => Language, { nullable: false })
  @JoinColumn({ name: 'target_language_id' })
  target_language: Language;

  @Column({
    type: 'enum',
    enum: UserVocabularyItemStatus,
    default: UserVocabularyItemStatus.Active,
  })
  status: UserVocabularyItemStatus;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
