import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmblemToSeasons1781913600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE seasons
      ADD COLUMN emblem VARCHAR(2048) NULL AFTER end_date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE seasons
      DROP COLUMN emblem
    `);
  }
}
