import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ConceptImage } from './concept-image.entity';
import { ConceptWord } from './concept-word.entity';
import { UserVocabularyItem } from './user-vocabulary-item.entity';
import { Word } from './word.entity';

export enum ConceptStatus {
  /** Personal concept created by a user; not visible in the shared dictionary. */
  Private = 'private',
  /** Submitted for admin review; still usable by the author. */
  Pending = 'pending',
  /** Admin-approved canonical concept visible in the shared dictionary. */
  Verified = 'verified',
  /** Rejected for the shared dictionary; still may remain usable by the author. */
  Rejected = 'rejected',
  /** Duplicate concept merged into another canonical concept. */
  Merged = 'merged',
}

@Entity({ name: 'concepts' })
export class Concept {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'primary_word_id', type: 'bigint', nullable: true })
  primary_word_id: number | null;

  @ManyToOne(() => Word, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'primary_word_id' })
  primary_word: Word | null;

  @Column({ name: 'created_by_user_id', type: 'bigint', nullable: true })
  created_by_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by_user: User | null;

  @Column({
    type: 'enum',
    enum: ConceptStatus,
    default: ConceptStatus.Private,
  })
  status: ConceptStatus;

  @Column({ name: 'verified_by_user_id', type: 'bigint', nullable: true })
  verified_by_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by_user_id' })
  verified_by_user: User | null;

  @Column({ type: 'timestamp', nullable: true })
  verified_at: Date | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  rejection_reason: string | null;

  @Column({ name: 'merged_into_concept_id', type: 'bigint', nullable: true })
  merged_into_concept_id: number | null;

  @ManyToOne(() => Concept, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'merged_into_concept_id' })
  merged_into_concept: Concept | null;

  @OneToMany(() => Concept, (concept) => concept.merged_into_concept)
  merged_concepts: Concept[];

  @OneToMany(() => ConceptWord, (conceptWord) => conceptWord.concept)
  concept_words: ConceptWord[];

  @OneToMany(() => ConceptImage, (conceptImage) => conceptImage.concept)
  images: ConceptImage[];

  @OneToMany(
    () => UserVocabularyItem,
    (userVocabularyItem) => userVocabularyItem.concept,
  )
  user_vocabulary_items: UserVocabularyItem[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
