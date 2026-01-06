import { AuthController } from './auth.controller';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RefreshTokenModule } from '../refreshToken/refresh-token.module';

@Module({
  imports: [RefreshTokenModule],
  providers: [AuthService],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
