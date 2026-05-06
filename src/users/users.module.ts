import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserStatus } from './entities/user-status.entity';
import { UserActivationLink } from './entities/user-activation-links.entity';
import { MailService } from '../mail/mail.service';
import { RefreshTokenModule } from '../refreshToken/refresh-token.module';
import { UserTelegramAccounts } from './entities/user-telegram-accounts.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserStatus,
      UserActivationLink,
      UserTelegramAccounts,
    ]),
    RefreshTokenModule,
  ],
  providers: [UsersService, MailService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
