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
import { User } from '../../users/entities/user.entity';
import { Concept } from './concept.entity';
import { Word } from './word.entity';

@Entity({ name: 'concept_words' })
@Index('UQ_concept_words_concept_word', ['concept_id', 'word_id'], {
  unique: true,
})
@Index('IDX_concept_words_concept_id', ['concept_id'])
@Index('IDX_concept_words_word_id', ['word_id'])
@Index('IDX_concept_words_created_by_user_id', ['created_by_user_id'])
export class ConceptWord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'concept_id', type: 'bigint' })
  concept_id: number;

  @ManyToOne(() => Concept, (concept) => concept.concept_words, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'concept_id' })
  concept: Concept;

  @Column({ name: 'word_id', type: 'bigint' })
  word_id: number;

  @ManyToOne(() => Word, (word) => word.concept_words, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'word_id' })
  word: Word;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  is_primary: boolean;

  @Column({ name: 'created_by_user_id', type: 'bigint', nullable: true })
  created_by_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by_user: User | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
