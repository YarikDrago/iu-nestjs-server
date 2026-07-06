import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity({ name: 'refresh_tokens' })
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // @RelationId((refreshToken: RefreshToken) => refreshToken.user)
  // user_id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  // Hash of token (not JWT)
  @Column({ name: 'token_hash' })
  token_hash: string;

  @Column({ name: 'device_id', type: 'varchar', length: 36, nullable: true })
  device_id: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  last_used_at: Date | null;

  @Column({ name: 'expired_at', type: 'timestamp' })
  expired_at: Date;

  @Column({ name: 'revoked', type: 'boolean' })
  revoked: boolean;
}
