import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSportsAndTeams1781568000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE sports (
        id BIGINT NOT NULL AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX UQ_sports_name (name),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      INSERT INTO sports (name)
      VALUES ('football')
    `);

    await queryRunner.query(`
      CREATE TABLE teams (
        id BIGINT NOT NULL AUTO_INCREMENT,
        sport_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        short_name VARCHAR(255) NULL,
        tla VARCHAR(20) NULL,
        crest VARCHAR(1000) NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX UQ_teams_sport_name (sport_id, name),
        INDEX IDX_teams_sport_id (sport_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      INSERT INTO teams (sport_id, name)
      SELECT football_sport.id, match_teams.name
      FROM (
        SELECT DISTINCT home_team AS name
        FROM matches
        WHERE home_team IS NOT NULL AND home_team <> ''
        UNION
        SELECT DISTINCT away_team AS name
        FROM matches
        WHERE away_team IS NOT NULL AND away_team <> ''
      ) match_teams
      INNER JOIN sports football_sport ON football_sport.name = 'football'
    `);

    await queryRunner.query(`
      ALTER TABLE matches
        ADD COLUMN home_team_id BIGINT NULL AFTER home_team,
        ADD COLUMN away_team_id BIGINT NULL AFTER away_team,
        ADD INDEX IDX_matches_home_team_id (home_team_id),
        ADD INDEX IDX_matches_away_team_id (away_team_id)
    `);

    await queryRunner.query(`
      UPDATE matches m
      INNER JOIN sports s ON s.name = 'football'
      INNER JOIN teams t ON t.sport_id = s.id AND t.name = m.home_team
      SET m.home_team_id = t.id
      WHERE m.home_team IS NOT NULL AND m.home_team <> ''
    `);

    await queryRunner.query(`
      UPDATE matches m
      INNER JOIN sports s ON s.name = 'football'
      INNER JOIN teams t ON t.sport_id = s.id AND t.name = m.away_team
      SET m.away_team_id = t.id
      WHERE m.away_team IS NOT NULL AND m.away_team <> ''
    `);

    await queryRunner.query(`
      ALTER TABLE teams
        ADD CONSTRAINT FK_teams_sport_id
        FOREIGN KEY (sport_id)
        REFERENCES sports(id)
    `);

    await queryRunner.query(`
      ALTER TABLE matches
        ADD CONSTRAINT FK_matches_home_team_id
        FOREIGN KEY (home_team_id)
        REFERENCES teams(id),
        ADD CONSTRAINT FK_matches_away_team_id
        FOREIGN KEY (away_team_id)
        REFERENCES teams(id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE matches
        DROP FOREIGN KEY FK_matches_away_team_id,
        DROP FOREIGN KEY FK_matches_home_team_id
    `);

    await queryRunner.query(`
      ALTER TABLE teams
        DROP FOREIGN KEY FK_teams_sport_id
    `);

    await queryRunner.query(`
      ALTER TABLE matches
        DROP INDEX IDX_matches_away_team_id,
        DROP INDEX IDX_matches_home_team_id,
        DROP COLUMN away_team_id,
        DROP COLUMN home_team_id
    `);

    await queryRunner.query('DROP TABLE teams');
    await queryRunner.query('DROP TABLE sports');
  }
}
