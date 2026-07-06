import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenSessionMetadata1781827200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      ADD COLUMN device_id VARCHAR(36) NULL AFTER token_hash,
      ADD COLUMN user_agent TEXT NULL AFTER device_id,
      ADD COLUMN ip_address VARCHAR(45) NULL AFTER user_agent,
      ADD COLUMN last_used_at TIMESTAMP NULL AFTER created_at
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX UQ_refresh_tokens_token_hash
      ON refresh_tokens (token_hash)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX UQ_refresh_tokens_user_device
      ON refresh_tokens (user_id, device_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX UQ_refresh_tokens_user_device ON refresh_tokens
    `);

    await queryRunner.query(`
      DROP INDEX UQ_refresh_tokens_token_hash ON refresh_tokens
    `);

    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      DROP COLUMN last_used_at,
      DROP COLUMN ip_address,
      DROP COLUMN user_agent,
      DROP COLUMN device_id
    `);
  }
}
