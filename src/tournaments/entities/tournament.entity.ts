import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { MaxLength } from 'class-validator';
import { Seasons } from './seasons.entity';

@Entity({ name: 'tournaments' })
export class Tournaments {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  external_id: number;

  @Column()
  @MaxLength(50)
  name: string;

  @Column({ type: 'boolean', default: false })
  isObservable: boolean;

  @OneToMany(() => Seasons, (s) => s.tournament)
  seasons: Seasons[];

  // @Column()
  // created_at: Date;
  //
  // @Column()
  // updated_at: Date;
  //
  // @Column()
  // @MaxLength(100)
  // source: string;
  //
  // @Column()
  // isActive: boolean;
}
