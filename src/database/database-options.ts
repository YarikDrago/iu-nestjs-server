import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { ResetPassword } from '../auth/entities/reset_passowrd.entity';
import { Language } from '../languages/entities/language.entity';
import { RefreshToken } from '../refreshToken/refresh-token.entity';
import { Group } from '../tournaments/entities/group.entity';
import { GroupMemberNotificationSettings } from '../tournaments/entities/group_member_notification_settings.entity';
import { GroupMemberRoleNames } from '../tournaments/entities/group_member_role_names.entity';
import { GroupMembers } from '../tournaments/entities/group_members.entity';
import { Matches } from '../tournaments/entities/matches.entity';
import { Predictions } from '../tournaments/entities/predictions.entity';
import { Seasons } from '../tournaments/entities/seasons.entity';
import { Sports } from '../tournaments/entities/sports.entity';
import { Teams } from '../tournaments/entities/teams.entity';
import { Tournaments } from '../tournaments/entities/tournament.entity';
import { TournamentUserNotificationSettings } from '../tournaments/entities/tournament_user_notification_settings.entity';
import { UserActivationLink } from '../users/entities/user-activation-links.entity';
import { UserRoleNames } from '../users/entities/user-role-names.entity';
import { UserRoles } from '../users/entities/user-roles.entity';
import { UserStatus } from '../users/entities/user-status.entity';
import { UserTelegramAccounts } from '../users/entities/user-telegram-accounts.entity';
import { User } from '../users/entities/user.entity';
import { Word } from '../vocabulary/entities/word.entity';
import { ensureDatabaseSshTunnel } from './database-ssh-tunnel';

export async function createDatabaseOptions(): Promise<DataSourceOptions> {
  const tunnel = await ensureDatabaseSshTunnel();

  return {
    type: 'mysql',
    host: tunnel?.localHost ?? process.env.DB_HOST,
    port: tunnel?.localPort ?? Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [
      User,
      UserStatus,
      UserActivationLink,
      UserRoles,
      UserRoleNames,
      UserTelegramAccounts,
      RefreshToken,
      ResetPassword,
      Tournaments,
      Seasons,
      Sports,
      Teams,
      Matches,
      Group,
      GroupMembers,
      GroupMemberRoleNames,
      GroupMemberNotificationSettings,
      TournamentUserNotificationSettings,
      Predictions,
      Language,
      Word,
    ],
    timezone: 'Z',
    ssl: process.env.DB_SSL_CA
      ? {
          ca: fs.readFileSync(path.resolve(process.env.DB_SSL_CA)),
        }
      : undefined,
  };
}
