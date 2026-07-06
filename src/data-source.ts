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
import { Sports } from './tournaments/entities/sports.entity';
import { Teams } from './tournaments/entities/teams.entity';
import { Group } from './tournaments/entities/group.entity';
import { GroupMembers } from './tournaments/entities/group_members.entity';
import { GroupMemberRoleNames } from './tournaments/entities/group_member_role_names.entity';
import { GroupMemberNotificationSettings } from './tournaments/entities/group_member_notification_settings.entity';
import { TournamentUserNotificationSettings } from './tournaments/entities/tournament_user_notification_settings.entity';
import { Predictions } from './tournaments/entities/predictions.entity';
// import { InitialSchema1780963200000 } from './migrations/1780963200000-InitialSchema';
import { CreateGroupMemberRoleNames1781049600000 } from './migrations/1781049600000-CreateGroupMemberRoleNames';
import { AlterMatchesStatusToEnum1781136000000 } from './migrations/1781136000000-AlterMatchesStatusToEnum';
import { AddHidePredictionsToMatches1781222400000 } from './migrations/1781222400000-AddHidePredictionsToMatches';
import { CascadeGroupMemberNotificationSettings1781308800000 } from './migrations/1781308800000-CascadeGroupMemberNotificationSettings';
import { AlterGroupMembersStatusToEnum1781395200000 } from './migrations/1781395200000-AlterGroupMembersStatusToEnum';
import { RemoveMatchNotificationsFromGroupMemberSettings1781481600000 } from './migrations/1781481600000-RemoveMatchNotificationsFromGroupMemberSettings';
import { CreateSportsAndTeams1781568000000 } from './migrations/1781568000000-CreateSportsAndTeams';
import { AddManualUpdateToMatches1781654400000 } from './migrations/1781654400000-AddManualUpdateToMatches';
import { RenameRefreshTokenTokenToTokenHash1781740800000 } from './migrations/1781740800000-RenameRefreshTokenTokenToTokenHash';

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
    Sports,
    Teams,
    Matches,
    Group,
    GroupMembers,
    GroupMemberRoleNames,
    GroupMemberNotificationSettings,
    TournamentUserNotificationSettings,
    Predictions,
  ],
  migrations: [
    // InitialSchema1780963200000, // TODO run this migration after FIFA
    CreateGroupMemberRoleNames1781049600000,
    AlterMatchesStatusToEnum1781136000000,
    AddHidePredictionsToMatches1781222400000,
    CascadeGroupMemberNotificationSettings1781308800000,
    AlterGroupMembersStatusToEnum1781395200000,
    RemoveMatchNotificationsFromGroupMemberSettings1781481600000,
    CreateSportsAndTeams1781568000000,
    AddManualUpdateToMatches1781654400000,
    RenameRefreshTokenTokenToTokenHash1781740800000,
  ],
  timezone: 'Z',
  // extra: {
  //   initSql: "SET time_zone = '+00:00'",
  // },
  ssl: process.env.DB_SSL_CA
    ? {
        ca: fs.readFileSync(path.resolve(process.env.DB_SSL_CA)),
      }
    : undefined,
});
