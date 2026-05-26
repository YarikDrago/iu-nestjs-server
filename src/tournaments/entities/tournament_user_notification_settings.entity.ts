import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tournaments } from './tournament.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'tournament_user_notification_settings' })
@Index(
  'UQ_tournament_user_notification_settings_tournament_user',
  ['tournamentId', 'userId'],
  { unique: true },
)
export class TournamentUserNotificationSettings {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'tournament_id', type: 'bigint' })
  tournamentId: number;

  @ManyToOne(() => Tournaments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournaments;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'notify_match_status_changed',
    type: 'boolean',
    default: false,
  })
  notifyMatchStatusChanged: boolean;

  @Column({
    name: 'notify_match_score_changed',
    type: 'boolean',
    default: false,
  })
  notifyMatchScoreChanged: boolean;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
