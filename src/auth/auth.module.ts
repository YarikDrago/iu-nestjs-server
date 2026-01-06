import { AuthController } from './auth.controller';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RefreshTokenModule } from '../refreshToken/refresh-token.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [RefreshTokenModule, UsersModule],
  providers: [AuthService],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
