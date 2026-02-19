import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'reset_password' })
export class ResetPassword {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'TIMESTAMP',
  })
  created_at: Date;

  @CreateDateColumn({
    name: 'expires_at',
    type: 'timestamp',
    default: () => 'now() + INTERVAL 1 DAY',
  })
  expires_at: Date;

  @CreateDateColumn({
    name: 'used_at',
    type: 'timestamp',
    nullable: true,
  })
  used_at: Date;

  @CreateDateColumn({
    name: 'revoked_at',
    type: 'timestamp',
    nullable: true,
  })
  revoked_at: Date;
}
