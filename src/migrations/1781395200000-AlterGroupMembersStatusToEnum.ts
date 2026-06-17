import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterGroupMembersStatusToEnum1781395200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const invalidStatuses: Array<{ status: string }> = await queryRunner.query(`
      SELECT DISTINCT status
      FROM group_members
      WHERE status NOT IN ('unverified', 'verified', 'rejected', 'left')
    `);

    if (invalidStatuses.length > 0) {
      throw new Error(
        `Cannot migrate group_members.status to enum. Invalid statuses found: ${invalidStatuses
          .map((row) => row.status)
          .join(', ')}`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE group_members
        MODIFY status ENUM('unverified', 'verified', 'rejected', 'left') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE group_members
        MODIFY status VARCHAR(100) NOT NULL
    `);
  }
}
