import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameRefreshTokenTokenToTokenHash1781740800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      CHANGE token token_hash VARCHAR(255) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      CHANGE token_hash token VARCHAR(255) NOT NULL
    `);
  }
}
