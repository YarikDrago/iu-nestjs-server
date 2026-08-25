import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConceptMergeFields1782432000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE concepts
        MODIFY status ENUM('private', 'pending', 'verified', 'rejected', 'merged') NOT NULL DEFAULT 'private',
        ADD merged_into_concept_id BIGINT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE concepts
        ADD INDEX IDX_concepts_merged_into_concept_id (merged_into_concept_id)
    `);

    await queryRunner.query(`
      ALTER TABLE concepts
        ADD CONSTRAINT FK_concepts_merged_into_concept_id
        FOREIGN KEY (merged_into_concept_id)
        REFERENCES concepts(id)
        ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE concepts
        DROP FOREIGN KEY FK_concepts_merged_into_concept_id
    `);

    await queryRunner.query(`
      ALTER TABLE concepts
        DROP INDEX IDX_concepts_merged_into_concept_id
    `);

    await queryRunner.query(`
      ALTER TABLE concepts
        DROP COLUMN merged_into_concept_id
    `);

    await queryRunner.query(`
      UPDATE concepts
      SET status = 'private'
      WHERE status = 'merged'
    `);

    await queryRunner.query(`
      ALTER TABLE concepts
        MODIFY status ENUM('private', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'private'
    `);
  }
}
