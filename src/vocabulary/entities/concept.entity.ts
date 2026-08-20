import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Word } from './word.entity';

export enum ConceptStatus {
  Pending = 'pending',
  Verified = 'verified',
  Rejected = 'rejected',
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
    default: ConceptStatus.Pending,
  })
  status: ConceptStatus;

  @Column({ name: 'verified_by_user_id', type: 'bigint', nullable: true })
  verified_by_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by_user_id' })
  verified_by_user: User | null;

  @Column({ type: 'timestamp', nullable: true })
  verified_at: Date | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
