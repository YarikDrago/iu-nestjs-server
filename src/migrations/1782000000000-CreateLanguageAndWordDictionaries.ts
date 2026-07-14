import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLanguageAndWordDictionaries1782000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE languages (
        id BIGINT NOT NULL AUTO_INCREMENT,
        code VARCHAR(10) NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX UQ_languages_code (code),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE words (
        id BIGINT NOT NULL AUTO_INCREMENT,
        language_id BIGINT NOT NULL,
        text VARCHAR(255) NOT NULL,
        normalized_text VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX UQ_words_language_normalized_text (language_id, normalized_text),
        INDEX IDX_words_language_id (language_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE words
        ADD CONSTRAINT FK_words_language_id
        FOREIGN KEY (language_id)
        REFERENCES languages(id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE words
        DROP FOREIGN KEY FK_words_language_id
    `);

    await queryRunner.query('DROP TABLE words');
    await queryRunner.query('DROP TABLE languages');
  }
}
