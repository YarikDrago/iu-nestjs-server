import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tournaments } from './tournament.entity';

@Entity({ name: 'seasons' })
export class Seasons {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  external_id: number;

  @Column({ name: 'tournament_id', type: 'bigint' })
  tournament_id: number;

  @ManyToOne(() => Tournaments)
  // @ManyToOne(() => Tournaments, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournaments;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({ type: 'boolean', default: false })
  is_current: boolean;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'TIMESTAMP',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'TIMESTAMP',
    onUpdate: 'TIMESTAMP',
  })
  updated_at: Date;
}
