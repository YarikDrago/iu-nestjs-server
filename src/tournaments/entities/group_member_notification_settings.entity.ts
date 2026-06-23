import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GroupMembers } from './group_members.entity';

@Entity({ name: 'group_member_notification_settings' })
@Index(
  'UQ_group_member_notification_settings_group_member_id',
  ['groupMemberId'],
  {
    unique: true,
  },
)
export class GroupMemberNotificationSettings {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'group_member_id', type: 'bigint' })
  groupMemberId: number;

  @OneToOne(() => GroupMembers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_member_id' })
  groupMember: GroupMembers;

  @Column({
    name: 'notify_prediction_reminder',
    type: 'boolean',
    default: false,
  })
  notifyPredictionReminder: boolean;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
