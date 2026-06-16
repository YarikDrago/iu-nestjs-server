import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHidePredictionsToMatches1781222400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE matches
        ADD hide_predictions TINYINT NOT NULL DEFAULT 0 COMMENT 'Hides other users'' predictions for this match'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE matches
        DROP COLUMN hide_predictions
    `);
  }
}
