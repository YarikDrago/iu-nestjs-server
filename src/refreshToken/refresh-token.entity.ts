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
  @Column({ name: 'token' })
  token: string;

  @Column({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @Column({ name: 'expired_at', type: 'timestamp' })
  expired_at: Date;

  @Column({ name: 'revoked', type: 'boolean' })
  revoked: boolean;
}
