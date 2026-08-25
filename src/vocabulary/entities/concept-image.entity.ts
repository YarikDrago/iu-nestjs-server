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

export enum ConceptImageStatus {
  Private = 'private',
  Pending = 'pending',
  Verified = 'verified',
  Rejected = 'rejected',
}

@Entity({ name: 'concept_images' })
@Index('IDX_concept_images_concept_id', ['concept_id'])
@Index('IDX_concept_images_created_by_user_id', ['created_by_user_id'])
@Index('IDX_concept_images_status', ['status'])
@Index('IDX_concept_images_is_primary', ['is_primary'])
export class ConceptImage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'concept_id', type: 'bigint' })
  concept_id: number;

  @ManyToOne(() => Concept, (concept) => concept.images, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'concept_id' })
  concept: Concept;

  @Column({ name: 'image_url', type: 'varchar', length: 1000 })
  image_url: string;

  @Column({ name: 'source_url', type: 'varchar', length: 1000, nullable: true })
  source_url: string | null;

  @Column({ name: 'alt_text', type: 'varchar', length: 255, nullable: true })
  alt_text: string | null;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  is_primary: boolean;

  @Column({ name: 'created_by_user_id', type: 'bigint', nullable: true })
  created_by_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by_user: User | null;

  @Column({
    type: 'enum',
    enum: ConceptImageStatus,
    default: ConceptImageStatus.Private,
  })
  status: ConceptImageStatus;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
