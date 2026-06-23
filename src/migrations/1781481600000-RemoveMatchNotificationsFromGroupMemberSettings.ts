import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveMatchNotificationsFromGroupMemberSettings1781481600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE group_member_notification_settings
        DROP COLUMN notify_match_status_changed,
        DROP COLUMN notify_match_score_changed
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE group_member_notification_settings
        ADD COLUMN notify_match_status_changed TINYINT NOT NULL DEFAULT 0 AFTER group_member_id,
        ADD COLUMN notify_match_score_changed TINYINT NOT NULL DEFAULT 0 AFTER notify_match_status_changed
    `);
  }
}
