import 'reflect-metadata';
import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { UserStatus } from './users/entities/user-status.entity';
import { UserActivationLink } from './users/entities/user-activation-links.entity';
import { UserRoles } from './users/entities/user-roles.entity';
import { UserRoleNames } from './users/entities/user-role-names.entity';
import { UserTelegramAccounts } from './users/entities/user-telegram-accounts.entity';
import { RefreshToken } from './refreshToken/refresh-token.entity';
import { ResetPassword } from './auth/entities/reset_passowrd.entity';
import { Tournaments } from './tournaments/entities/tournament.entity';
import { Seasons } from './tournaments/entities/seasons.entity';
import { Matches } from './tournaments/entities/matches.entity';
import { Group } from './tournaments/entities/group.entity';
import { GroupMembers } from './tournaments/entities/group_members.entity';
import { GroupMemberRoleNames } from './tournaments/entities/group_member_role_names.entity';
import { GroupMemberNotificationSettings } from './tournaments/entities/group_member_notification_settings.entity';
import { TournamentUserNotificationSettings } from './tournaments/entities/tournament_user_notification_settings.entity';
import { Predictions } from './tournaments/entities/predictions.entity';
import { CreateGroupMemberRoleNames1781049600000 } from './migrations/1781049600000-CreateGroupMemberRoleNames';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
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
    Matches,
    Group,
    GroupMembers,
    GroupMemberRoleNames,
    GroupMemberNotificationSettings,
    TournamentUserNotificationSettings,
    Predictions,
  ],
  migrations: [CreateGroupMemberRoleNames1781049600000],
  timezone: 'Z',
  extra: {
    initSql: "SET time_zone = '+00:00'",
  },
  ssl: process.env.DB_SSL_CA
    ? {
        ca: fs.readFileSync(path.resolve(process.env.DB_SSL_CA)),
      }
    : undefined,
});
