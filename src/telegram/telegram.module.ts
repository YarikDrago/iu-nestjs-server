import { forwardRef, Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { UsersModule } from '../users/users.module';
import { TournamentsModule } from '../tournaments/tournaments.module';

@Module({
  /* forwardRef(() => TournamentsModule) for breaking circular dependency between TournamentsModule and TelegramModule */
  imports: [UsersModule, forwardRef(() => TournamentsModule)],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
