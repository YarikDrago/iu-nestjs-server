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
import { Language } from './language.entity';

@Entity({ name: 'words' })
@Index(
  'UQ_words_language_normalized_text',
  ['language_id', 'normalized_text'],
  {
    unique: true,
  },
)
export class Word {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'language_id', type: 'bigint' })
  language_id: number;

  @ManyToOne(() => Language, (language) => language.words)
  @JoinColumn({ name: 'language_id' })
  language: Language;

  @Column({ type: 'varchar', length: 255 })
  text: string;

  @Column({ type: 'varchar', length: 255 })
  normalized_text: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
