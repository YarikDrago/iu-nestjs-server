import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserStatus } from '../user-status/user-status.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  nickname: string;

  @ManyToOne(() => UserStatus, (status) => status.users, { eager: true })
  @JoinColumn({ name: 'status_id' })
  status: UserStatus;
}
