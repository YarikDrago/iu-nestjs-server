import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManualUpdateToMatches1781654400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE matches
        ADD manualUpdate TINYINT NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE matches
        DROP COLUMN manualUpdate
    `);
  }
}
