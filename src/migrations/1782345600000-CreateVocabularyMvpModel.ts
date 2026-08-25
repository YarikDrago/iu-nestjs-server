import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVocabularyMvpModel1782345600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE concepts
        MODIFY status ENUM('private', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'private',
        ADD rejection_reason VARCHAR(1000) NULL
    `);

    await queryRunner.query(`
      CREATE TABLE concept_words (
        id BIGINT NOT NULL AUTO_INCREMENT,
        concept_id BIGINT NOT NULL,
        word_id BIGINT NOT NULL,
        is_primary TINYINT NOT NULL DEFAULT 0,
        created_by_user_id BIGINT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX UQ_concept_words_concept_word (concept_id, word_id),
        INDEX IDX_concept_words_concept_id (concept_id),
        INDEX IDX_concept_words_word_id (word_id),
        INDEX IDX_concept_words_created_by_user_id (created_by_user_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE concept_words
        ADD CONSTRAINT FK_concept_words_concept_id
        FOREIGN KEY (concept_id)
        REFERENCES concepts(id)
        ON DELETE CASCADE,
        ADD CONSTRAINT FK_concept_words_word_id
        FOREIGN KEY (word_id)
        REFERENCES words(id)
        ON DELETE CASCADE,
        ADD CONSTRAINT FK_concept_words_created_by_user_id
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE concept_images (
        id BIGINT NOT NULL AUTO_INCREMENT,
        concept_id BIGINT NOT NULL,
        image_url VARCHAR(1000) NOT NULL,
        source_url VARCHAR(1000) NULL,
        alt_text VARCHAR(255) NULL,
        is_primary TINYINT NOT NULL DEFAULT 0,
        created_by_user_id BIGINT NULL,
        status ENUM('private', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'private',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX IDX_concept_images_concept_id (concept_id),
        INDEX IDX_concept_images_created_by_user_id (created_by_user_id),
        INDEX IDX_concept_images_status (status),
        INDEX IDX_concept_images_is_primary (is_primary),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE concept_images
        ADD CONSTRAINT FK_concept_images_concept_id
        FOREIGN KEY (concept_id)
        REFERENCES concepts(id)
        ON DELETE CASCADE,
        ADD CONSTRAINT FK_concept_images_created_by_user_id
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE user_vocabulary_items (
        id BIGINT NOT NULL AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        concept_id BIGINT NOT NULL,
        source_language_id BIGINT NOT NULL,
        target_language_id BIGINT NOT NULL,
        status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX UQ_user_vocabulary_items_user_concept_languages (user_id, concept_id, source_language_id, target_language_id),
        INDEX IDX_user_vocabulary_items_user_id (user_id),
        INDEX IDX_user_vocabulary_items_concept_id (concept_id),
        INDEX IDX_user_vocabulary_items_source_language_id (source_language_id),
        INDEX IDX_user_vocabulary_items_target_language_id (target_language_id),
        INDEX IDX_user_vocabulary_items_status (status),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE user_vocabulary_items
        ADD CONSTRAINT FK_user_vocabulary_items_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
        ADD CONSTRAINT FK_user_vocabulary_items_concept_id
        FOREIGN KEY (concept_id)
        REFERENCES concepts(id)
        ON DELETE CASCADE,
        ADD CONSTRAINT FK_user_vocabulary_items_source_language_id
        FOREIGN KEY (source_language_id)
        REFERENCES languages(id)
        ON DELETE RESTRICT,
        ADD CONSTRAINT FK_user_vocabulary_items_target_language_id
        FOREIGN KEY (target_language_id)
        REFERENCES languages(id)
        ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_vocabulary_items
        DROP FOREIGN KEY FK_user_vocabulary_items_target_language_id,
        DROP FOREIGN KEY FK_user_vocabulary_items_source_language_id,
        DROP FOREIGN KEY FK_user_vocabulary_items_concept_id,
        DROP FOREIGN KEY FK_user_vocabulary_items_user_id
    `);

    await queryRunner.query('DROP TABLE user_vocabulary_items');

    await queryRunner.query(`
      ALTER TABLE concept_images
        DROP FOREIGN KEY FK_concept_images_created_by_user_id,
        DROP FOREIGN KEY FK_concept_images_concept_id
    `);

    await queryRunner.query('DROP TABLE concept_images');

    await queryRunner.query(`
      ALTER TABLE concept_words
        DROP FOREIGN KEY FK_concept_words_created_by_user_id,
        DROP FOREIGN KEY FK_concept_words_word_id,
        DROP FOREIGN KEY FK_concept_words_concept_id
    `);

    await queryRunner.query('DROP TABLE concept_words');

    await queryRunner.query(`
      UPDATE concepts
      SET status = 'pending'
      WHERE status = 'private'
    `);

    await queryRunner.query(`
      ALTER TABLE concepts
        MODIFY status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
        DROP COLUMN rejection_reason
    `);
  }
}
