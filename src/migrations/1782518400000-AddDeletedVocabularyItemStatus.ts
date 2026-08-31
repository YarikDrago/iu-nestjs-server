import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedVocabularyItemStatus1782518400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_vocabulary_items
        MODIFY status ENUM('active', 'archived', 'deleted') NOT NULL DEFAULT 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE user_vocabulary_items
      SET status = 'archived'
      WHERE status = 'deleted'
    `);

    await queryRunner.query(`
      ALTER TABLE user_vocabulary_items
        MODIFY status ENUM('active', 'archived') NOT NULL DEFAULT 'active'
    `);
  }
}
