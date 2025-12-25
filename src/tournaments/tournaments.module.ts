import { TournamentsService } from './tournaments.service';
import { Module } from '@nestjs/common';
import { FootballModule } from '../football/football.module';
import { TournamentsController } from './tournaments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournaments } from './entities/tournament.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tournaments]), FootballModule],
  providers: [TournamentsService],
  exports: [TournamentsService],
  controllers: [TournamentsController],
})
export class TournamentsModule {}
