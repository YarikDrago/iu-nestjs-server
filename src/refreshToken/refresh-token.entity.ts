import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'refresh_tokens' })
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number;

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
