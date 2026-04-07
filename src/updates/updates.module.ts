import { Module } from '@nestjs/common';
import { UpdatesGateway } from './updates.gateway';
import { UpdatesService } from './updates.service';

@Module({
  providers: [UpdatesGateway, UpdatesService],
  exports: [UpdatesGateway, UpdatesService],
})
export class UpdatesModule {}
