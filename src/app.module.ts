import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { User } from './users/user.entity';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigModule } from '@nestjs/config';
import { UserStatus } from './user-status/user-status.entity';

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
      entities: [User, UserStatus],
      // synchronize: true, // WARNING!

      ssl: process.env.DB_SSL_CA
        ? {
            ca: fs.readFileSync(path.resolve(process.env.DB_SSL_CA)),
          }
        : undefined,
    }),
    UsersModule,
  ],
})
export class AppModule {}
