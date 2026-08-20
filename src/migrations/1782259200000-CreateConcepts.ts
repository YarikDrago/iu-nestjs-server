import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConcepts1782259200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE concepts (
        id BIGINT NOT NULL AUTO_INCREMENT,
        primary_word_id BIGINT NULL,
        created_by_user_id BIGINT NULL,
        status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
        verified_by_user_id BIGINT NULL,
        verified_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX IDX_concepts_primary_word_id (primary_word_id),
        INDEX IDX_concepts_created_by_user_id (created_by_user_id),
        INDEX IDX_concepts_status (status),
        INDEX IDX_concepts_verified_by_user_id (verified_by_user_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE concepts
        ADD CONSTRAINT FK_concepts_primary_word_id
        FOREIGN KEY (primary_word_id)
        REFERENCES words(id)
        ON DELETE SET NULL,
        ADD CONSTRAINT FK_concepts_created_by_user_id
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
        ADD CONSTRAINT FK_concepts_verified_by_user_id
        FOREIGN KEY (verified_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE concepts
        DROP FOREIGN KEY FK_concepts_verified_by_user_id,
        DROP FOREIGN KEY FK_concepts_created_by_user_id,
        DROP FOREIGN KEY FK_concepts_primary_word_id
    `);

    await queryRunner.query('DROP TABLE concepts');
  }
}
