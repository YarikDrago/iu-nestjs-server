import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Seasons } from './seasons.entity';
import { Tournaments } from './tournament.entity';

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  POSTPONED = 'POSTPONED',
  SUSPENDED = 'SUSPENDED',
  TIMED = 'TIMED',
  IN_PLAY = 'IN_PLAY',
  FINISHED = 'FINISHED',
}

@Entity({ name: 'matches' })
export class Matches {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  external_id: number;

  @Column({ name: 'season_id', type: 'bigint' })
  season_id: number;

  @ManyToOne(() => Seasons)
  @JoinColumn({ name: 'season_id' })
  season: Seasons;

  @Column({ name: 'tournament_id', type: 'bigint' })
  tournament_id: number;

  @ManyToOne(() => Tournaments)
  // @ManyToOne(() => Tournaments, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournaments;

  @Column({ type: 'varchar', length: 255, nullable: true })
  home_team: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  away_team: string | null;

  @Column({ type: 'timestamp', nullable: true })
  start_time: Date | null;

  @Column({ type: 'enum', enum: MatchStatus, nullable: true })
  status: MatchStatus | null;

  @Column({ type: 'int', nullable: true })
  home_score: number | null;

  @Column({ type: 'int', nullable: true })
  away_score: number | null;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'TIMESTAMP',
    onUpdate: 'TIMESTAMP',
  })
  updated_at: Date;
}
