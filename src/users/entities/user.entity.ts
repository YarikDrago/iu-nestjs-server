import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserStatus } from './user-status.entity';
import { UserActivationLink } from './user-activation-links.entity';

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

  // TODO ??? delete cause activationLinks is not needed
  @OneToMany(
    () => UserActivationLink,
    (activationLink) => activationLink.user_id,
  )
  activationLinks: UserActivationLink[];
}
