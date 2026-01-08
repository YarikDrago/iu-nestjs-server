import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserStatus } from './entities/user-status.entity';
import { UserActivationLink } from './entities/user-activation-links.entity';
import { MailService } from '../mail/mail.service';
import { RefreshTokenModule } from '../refreshToken/refresh-token.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserStatus, UserActivationLink]),
    RefreshTokenModule,
  ],
  providers: [UsersService, MailService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
