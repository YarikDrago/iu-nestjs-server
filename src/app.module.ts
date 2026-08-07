import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { RefreshTokenModule } from './refreshToken/refresh-token.module';
import { FootballModule } from './football/football.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { AuthModule } from './auth/auth.module';
import { UpdatesModule } from './updates/updates.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SystemModule } from './system/system.module';
import { TelegramModule } from './telegram/telegram.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { LanguagesModule } from './languages/languages.module';
import { createDatabaseOptions } from './database/database-options';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client/dist'),
      exclude: ['/api'],
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: createDatabaseOptions,
    }),
    SystemModule,
    UsersModule,
    AuthModule,
    TelegramModule,
    HealthModule,
    MailModule,
    LanguagesModule,
    ProductsModule,
    RefreshTokenModule,
    FootballModule,
    TournamentsModule,
    UpdatesModule,
  ],
})
export class AppModule {}
