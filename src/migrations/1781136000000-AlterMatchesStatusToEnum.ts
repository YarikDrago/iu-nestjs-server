import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterMatchesStatusToEnum1781136000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const invalidStatuses: Array<{ status: string }> = await queryRunner.query(`
      SELECT DISTINCT status
      FROM matches
      WHERE status IS NOT NULL
        AND status NOT IN (
                           'SCHEDULED',
                           'POSTPONED',
                           'SUSPENDED',
                           'TIMED',
                           'IN_PLAY',
                           'FINISHED'
        )
    `);

    if (invalidStatuses.length > 0) {
      throw new Error(
        `Cannot migrate matches.status to enum. Invalid statuses found: ${invalidStatuses
          .map((row) => row.status)
          .join(', ')}`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE matches
        MODIFY status ENUM(
        'SCHEDULED',
        'POSTPONED',
        'SUSPENDED',
        'TIMED',
        'IN_PLAY',
        'FINISHED'
        ) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE matches
      MODIFY status VARCHAR(100) NULL
    `);
  }
}
