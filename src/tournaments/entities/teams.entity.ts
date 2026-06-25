import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Matches } from './matches.entity';
import { Sports } from './sports.entity';

@Entity({ name: 'teams' })
@Index('UQ_teams_sport_name', ['sport_id', 'name'], { unique: true })
export class Teams {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'sport_id', type: 'bigint' })
  sport_id: number;

  @ManyToOne(() => Sports, (sport) => sport.teams)
  @JoinColumn({ name: 'sport_id' })
  sport: Sports;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  short_name: string | null;

  // Three-Letter Acronym
  @Column({ type: 'varchar', length: 20, nullable: true })
  tla: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  crest: string | null;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'TIMESTAMP',
    onUpdate: 'TIMESTAMP',
  })
  updated_at: Date;

  @OneToMany(() => Matches, (match) => match.home_team_entity)
  home_matches: Matches[];

  @OneToMany(() => Matches, (match) => match.away_team_entity)
  away_matches: Matches[];
}
