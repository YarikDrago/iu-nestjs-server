import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Teams } from './teams.entity';

@Entity({ name: 'sports' })
export class Sports {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'TIMESTAMP',
    onUpdate: 'TIMESTAMP',
  })
  updated_at: Date;

  @OneToMany(() => Teams, (team) => team.sport)
  teams: Teams[];
}
