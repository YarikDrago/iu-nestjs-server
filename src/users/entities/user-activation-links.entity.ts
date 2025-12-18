import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'user_activation_links' })
export class UserActivationLink {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @Index({ unique: true })
  @Column()
  activation_link: string;

  @Column({ type: 'timestamp' })
  expiration_date: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date;
}
