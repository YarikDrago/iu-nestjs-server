import { MigrationInterface, QueryRunner } from 'typeorm';

export class CascadeGroupMemberNotificationSettings1781308800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.dropGroupMemberNotificationSettingsForeignKey(queryRunner);

    await queryRunner.query(`
      ALTER TABLE group_member_notification_settings
        ADD CONSTRAINT group_member_notification_settings_group_members_FK
        FOREIGN KEY (group_member_id)
        REFERENCES group_members(id)
        ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropGroupMemberNotificationSettingsForeignKey(queryRunner);

    await queryRunner.query(`
      ALTER TABLE group_member_notification_settings
        ADD CONSTRAINT group_member_notification_settings_group_members_FK
        FOREIGN KEY (group_member_id)
        REFERENCES group_members(id)
    `);
  }

  private async dropGroupMemberNotificationSettingsForeignKey(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      SET @group_member_notification_settings_fk_name := (
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'group_member_notification_settings'
          AND COLUMN_NAME = 'group_member_id'
          AND REFERENCED_TABLE_NAME = 'group_members'
        LIMIT 1
      )
    `);

    await queryRunner.query(`
      SET @drop_group_member_notification_settings_fk_sql := IF(
        @group_member_notification_settings_fk_name IS NULL,
        'SELECT 1',
        CONCAT(
          'ALTER TABLE group_member_notification_settings DROP FOREIGN KEY \`',
          @group_member_notification_settings_fk_name,
          '\`'
        )
      )
    `);

    await queryRunner.query(`
      PREPARE drop_group_member_notification_settings_fk_stmt
      FROM @drop_group_member_notification_settings_fk_sql
    `);
    await queryRunner.query(`
      EXECUTE drop_group_member_notification_settings_fk_stmt
    `);
    await queryRunner.query(`
      DEALLOCATE PREPARE drop_group_member_notification_settings_fk_stmt
    `);
  }
}
