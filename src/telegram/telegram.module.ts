import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
