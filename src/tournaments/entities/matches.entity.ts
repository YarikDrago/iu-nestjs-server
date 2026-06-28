import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Seasons } from './seasons.entity';
import { Teams } from './teams.entity';
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

  @Column({ name: 'home_team_id', type: 'bigint', nullable: true })
  home_team_id: number | null;

  @ManyToOne(() => Teams, (team) => team.home_matches, { nullable: true })
  @JoinColumn({ name: 'home_team_id' })
  home_team_entity: Teams | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  away_team: string | null;

  @Column({ name: 'away_team_id', type: 'bigint', nullable: true })
  away_team_id: number | null;

  @ManyToOne(() => Teams, (team) => team.away_matches, { nullable: true })
  @JoinColumn({ name: 'away_team_id' })
  away_team_entity: Teams | null;

  @Column({ type: 'timestamp', nullable: true })
  start_time: Date | null;

  @Column({ type: 'enum', enum: MatchStatus, nullable: true })
  status: MatchStatus | null;

  @Column({ type: 'int', nullable: true })
  home_score: number | null;

  @Column({ type: 'int', nullable: true })
  away_score: number | null;

  @Column({
    type: 'boolean',
    default: false,
    comment: "Hides other users' predictions for this match",
  })
  hide_predictions: boolean;

  @Column({
    name: 'manualUpdate',
    type: 'boolean',
    default: false,
  })
  manualUpdate: boolean;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'TIMESTAMP',
    onUpdate: 'TIMESTAMP',
  })
  updated_at: Date;
}
