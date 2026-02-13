import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MaxLength } from 'class-validator';
import { Tournaments } from './tournament.entity';
import { Seasons } from './seasons.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'groups' })
export class Group {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  @MaxLength(255)
  name: string;

  @Column({ name: 'owner_id', type: 'bigint' })
  owner_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'tournament_id', type: 'bigint' })
  tournament_id: number;

  @ManyToOne(() => Tournaments)
  // @ManyToOne(() => Tournaments, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournaments;

  @Column({ name: 'season_id', type: 'bigint' })
  season_id: number;

  @ManyToOne(() => Seasons)
  @JoinColumn({ name: 'season_id' })
  season: Seasons;

  @Column({ type: 'varchar', length: 50, nullable: false })
  @MaxLength(50)
  invite_code: string;

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
