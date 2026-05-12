import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { User } from '../../users/entities/user.entity';
import { GroupMemberNotificationSettings } from './group_member_notification_settings.entity';

@Entity({ name: 'group_members' })
export class GroupMembers {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @OneToOne(
    () => GroupMemberNotificationSettings,
    (settings) => settings.groupMember,
  )
  notificationSettings: GroupMemberNotificationSettings;

  @Column({ name: 'group_id', type: 'bigint' })
  group_id: number;

  @ManyToOne(() => Group)
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ name: 'user_id', type: 'bigint' })
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'TIMESTAMP',
  })
  joined_at: Date;

  // TODO create enum or special table statuses
  @Column({ type: 'varchar', length: 100, nullable: false })
  status: string; // unverified, verified, rejected
}
