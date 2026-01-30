import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { MaxLength } from 'class-validator';

@Entity({ name: 'tournaments' })
export class Tournaments {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  external_id: number;

  @Column()
  @MaxLength(50)
  name: string;

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
