import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'user_telegram_accounts' })
export class UserTelegramAccounts {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'telegram_user_id', type: 'bigint', unique: true })
  telegramUserId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 255, nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 255, nullable: true })
  lastName: string | null;

  @Column({ name: 'chat_id', type: 'bigint', nullable: true })
  chatId: number | null;

  @Column({ name: 'linked_at', type: 'datetime' })
  linkedAt: Date;
}
