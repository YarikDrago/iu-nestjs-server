import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTesterUserRole1782604800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT IGNORE INTO user_role_names (name)
      VALUES ('tester')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_role_names
      WHERE name = 'tester'
      AND NOT EXISTS (
        SELECT 1
        FROM user_roles
        WHERE user_roles.role_id = user_role_names.id
      )
    `);
  }
}
