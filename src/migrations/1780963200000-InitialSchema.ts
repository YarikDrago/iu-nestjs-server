import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1780963200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_status (
        id BIGINT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        UNIQUE INDEX UQ_user_status_name (name),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id BIGINT NOT NULL AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        nickname VARCHAR(255) NOT NULL,
        status_id BIGINT NULL,
        UNIQUE INDEX UQ_users_email (email),
        INDEX IDX_users_status_id (status_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE user_activation_links (
        id BIGINT NOT NULL AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        activation_link VARCHAR(255) NOT NULL,
        expiration_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        usedAt TIMESTAMP NULL,
        UNIQUE INDEX UQ_user_activation_links_activation_link (activation_link),
        INDEX IDX_user_activation_links_user_id (user_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE user_role_names (
        id BIGINT NOT NULL AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        UNIQUE INDEX UQ_user_role_names_name (name),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE user_roles (
        id BIGINT NOT NULL AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        role_id BIGINT NOT NULL,
        UNIQUE INDEX UQ_user_roles_user_role (user_id, role_id),
        INDEX IDX_user_roles_user_id (user_id),
        INDEX IDX_user_roles_role_id (role_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE user_telegram_accounts (
        id BIGINT NOT NULL AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        telegram_user_id BIGINT NOT NULL,
        username VARCHAR(255) NULL,
        first_name VARCHAR(255) NULL,
        last_name VARCHAR(255) NULL,
        chat_id BIGINT NULL,
        linked_at DATETIME NOT NULL,
        UNIQUE INDEX UQ_user_telegram_accounts_telegram_user_id (telegram_user_id),
        INDEX IDX_user_telegram_accounts_user_id (user_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id BIGINT NOT NULL AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        token VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL,
        expired_at TIMESTAMP NOT NULL,
        revoked TINYINT NOT NULL,
        INDEX IDX_refresh_tokens_user_id (user_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE reset_password (
        id BIGINT NOT NULL AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        token_hash VARCHAR(64) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 1 DAY),
        used_at TIMESTAMP NULL,
        revoked_at TIMESTAMP NULL,
        INDEX IDX_reset_password_user_id (user_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE tournaments (
        id BIGINT NOT NULL AUTO_INCREMENT,
        external_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        isObservable TINYINT NOT NULL DEFAULT 0,
        UNIQUE INDEX UQ_tournaments_external_id (external_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE seasons (
        id BIGINT NOT NULL AUTO_INCREMENT,
        external_id BIGINT NOT NULL,
        tournament_id BIGINT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_current TINYINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX UQ_seasons_external_id (external_id),
        INDEX IDX_seasons_tournament_id (tournament_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE matches (
        id BIGINT NOT NULL AUTO_INCREMENT,
        external_id BIGINT NOT NULL,
        season_id BIGINT NOT NULL,
        tournament_id BIGINT NOT NULL,
        home_team VARCHAR(255) NULL,
        away_team VARCHAR(255) NULL,
        start_time TIMESTAMP NULL,
        status VARCHAR(100) NULL,
        home_score INT NULL,
        away_score INT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX UQ_matches_external_id (external_id),
        INDEX IDX_matches_season_id (season_id),
        INDEX IDX_matches_tournament_id (tournament_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`groups\` (
        id BIGINT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        owner_id BIGINT NOT NULL,
        tournament_id BIGINT NOT NULL,
        season_id BIGINT NOT NULL,
        invite_code VARCHAR(50) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX UQ_groups_invite_code (invite_code),
        INDEX IDX_groups_owner_id (owner_id),
        INDEX IDX_groups_tournament_id (tournament_id),
        INDEX IDX_groups_season_id (season_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE group_members (
        id BIGINT NOT NULL AUTO_INCREMENT,
        group_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status ENUM('unverified', 'verified', 'rejected', 'left') NOT NULL,
        UNIQUE INDEX UQ_group_members_group_user (group_id, user_id),
        INDEX IDX_group_members_group_id (group_id),
        INDEX IDX_group_members_user_id (user_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE group_member_notification_settings (
        id BIGINT NOT NULL AUTO_INCREMENT,
        group_member_id BIGINT NOT NULL,
        notify_match_status_changed TINYINT NOT NULL DEFAULT 0,
        notify_match_score_changed TINYINT NOT NULL DEFAULT 0,
        notify_prediction_reminder TINYINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX UQ_group_member_notification_settings_group_member_id (group_member_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE tournament_user_notification_settings (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tournament_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        notify_match_status_changed TINYINT NOT NULL DEFAULT 0,
        notify_match_score_changed TINYINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX UQ_tournament_user_notification_settings_tournament_user (tournament_id, user_id),
        INDEX IDX_tournament_user_notification_settings_tournament_id (tournament_id),
        INDEX IDX_tournament_user_notification_settings_user_id (user_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE predictions (
        id BIGINT NOT NULL AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        group_id BIGINT NOT NULL,
        match_id BIGINT NOT NULL,
        home_score INT NOT NULL,
        away_score INT NOT NULL,
        points INT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX UQ_predictions_user_group_match (user_id, group_id, match_id),
        INDEX IDX_predictions_user_id (user_id),
        INDEX IDX_predictions_group_id (group_id),
        INDEX IDX_predictions_match_id (match_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE predictions');
    await queryRunner.query('DROP TABLE tournament_user_notification_settings');
    await queryRunner.query('DROP TABLE group_member_notification_settings');
    await queryRunner.query('DROP TABLE group_members');
    await queryRunner.query('DROP TABLE `groups`');
    await queryRunner.query('DROP TABLE matches');
    await queryRunner.query('DROP TABLE seasons');
    await queryRunner.query('DROP TABLE tournaments');
    await queryRunner.query('DROP TABLE reset_password');
    await queryRunner.query('DROP TABLE refresh_tokens');
    await queryRunner.query('DROP TABLE user_telegram_accounts');
    await queryRunner.query('DROP TABLE user_roles');
    await queryRunner.query('DROP TABLE user_role_names');
    await queryRunner.query('DROP TABLE user_activation_links');
    await queryRunner.query('DROP TABLE users');
    await queryRunner.query('DROP TABLE user_status');
  }
}
