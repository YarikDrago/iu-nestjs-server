import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { UserRoleNames } from './user-role-names.entity';

@Entity({ name: 'user_roles' })
@Unique('UQ_user_roles_user_role', ['user_id', 'role_id'])
@Index('IDX_user_roles_user_id', ['user_id'])
@Index('IDX_user_roles_role_id', ['role_id'])
export class UserRoles {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  user_id!: number;

  @Column({ type: 'bigint' })
  role_id!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user!: User;

  @ManyToOne(() => UserRoleNames, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id', referencedColumnName: 'id' })
  role!: UserRoleNames;
}
