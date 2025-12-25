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

@Module({
  imports: [
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
        RefreshToken,
        Tournaments,
      ],
      // synchronize: true, // WARNING!
      timezone: 'Z',

      ssl: process.env.DB_SSL_CA
        ? {
            ca: fs.readFileSync(path.resolve(process.env.DB_SSL_CA)),
          }
        : undefined,
    }),
    UsersModule,
    RefreshTokenModule,
    FootballModule,
    TournamentsModule,
  ],
})
export class AppModule {}
