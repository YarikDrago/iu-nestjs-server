import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Group } from './group.entity';
import { Matches } from './matches.entity';

@Entity({ name: 'predictions' })
@Unique(['user_id', 'group_id', 'match_id'])
export class Predictions {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'group_id', type: 'bigint' })
  group_id: number;

  @ManyToOne(() => Group)
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ name: 'match_id', type: 'bigint' })
  match_id: number;

  @ManyToOne(() => Matches)
  @JoinColumn({ name: 'match_id' })
  match: Matches;

  @Column({ type: 'int' })
  home_score: number;

  @Column({ type: 'int' })
  away_score: number;

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
