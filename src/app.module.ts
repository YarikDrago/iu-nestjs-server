import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigModule } from '@nestjs/config';
import { UserStatus } from './users/entities/user-status.entity';
import { UserActivationLink } from './users/entities/user-activation-links.entity';
import { RefreshTokenModule } from './refreshToken/refresh-token.module';
import { RefreshToken } from './refreshToken/refresh-token.entity';
import { FootballModule } from './football/football.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { Tournaments } from './tournaments/entities/tournament.entity';
import { AuthModule } from './auth/auth.module';
import { UserRoles } from './users/entities/user-roles.entity';
import { UserRoleNames } from './users/entities/user-role-names.entity';
import { Seasons } from './tournaments/entities/seasons.entity';
import { Matches } from './tournaments/entities/matches.entity';
import { UpdatesModule } from './updates/updates.module';
import { Group } from './tournaments/entities/group.entity';
import { GroupMembers } from './tournaments/entities/group_members.entity';
import { ResetPassword } from './auth/entities/reset_passowrd.entity';
import { Predictions } from './tournaments/entities/predictions.entity';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SystemModule } from './system/system.module';
import { TelegramModule } from './telegram/telegram.module';
import { UserTelegramAccounts } from './users/entities/user-telegram-accounts.entity';
import { GroupMemberNotificationSettings } from './tournaments/entities/group_member_notification_settings.entity';
import { TournamentUserNotificationSettings } from './tournaments/entities/tournament_user_notification_settings.entity';
import { GroupMemberRoleNames } from './tournaments/entities/group_member_role_names.entity';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client/dist'),
      exclude: ['/api'],
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
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
        Seasons, // Competition Seasons
        Matches, // All matches from competitions
        Group, // Groups for prediction tournaments
        GroupMembers,
        GroupMemberRoleNames,
        GroupMemberNotificationSettings,
        TournamentUserNotificationSettings,
        Predictions,
      ],
      // synchronize: true, // WARNING!
      timezone: 'Z',
      // extra: {
      //   initSql: "SET time_zone = '+00:00'",
      // },

      ssl: process.env.DB_SSL_CA
        ? {
            ca: fs.readFileSync(path.resolve(process.env.DB_SSL_CA)),
          }
        : undefined,
    }),
    SystemModule,
    UsersModule,
    AuthModule,
    TelegramModule,
    RefreshTokenModule,
    FootballModule,
    TournamentsModule,
    UpdatesModule,
  ],
})
export class AppModule {}
