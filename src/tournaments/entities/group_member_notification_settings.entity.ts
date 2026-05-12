import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GroupMembers } from './group_members.entity';

@Entity({ name: 'group_member_notification_settings' })
export class GroupMemberNotificationSettings {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'group_member_id', type: 'bigint' })
  groupMemberId: number;

  @OneToOne(() => GroupMembers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_member_id' })
  groupMember: GroupMembers;

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

  @Column({
    name: 'notify_prediction_changed',
    type: 'boolean',
    default: false,
  })
  notifyPredictionChanged: boolean;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
