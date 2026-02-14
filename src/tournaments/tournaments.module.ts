import { TournamentsService } from './tournaments.service';
import { Module } from '@nestjs/common';
import { FootballModule } from '../football/football.module';
import { TournamentsController } from './tournaments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournaments } from './entities/tournament.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { Seasons } from './entities/seasons.entity';
import { Matches } from './entities/matches.entity';
import { UpdatesModule } from '../updates/updates.module';
import { Group } from './entities/group.entity';
import { GroupMembers } from './entities/group_members.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tournaments,
      Seasons,
      Matches,
      Group,
      GroupMembers,
    ]),
    FootballModule,
    AuthModule,
    UsersModule,
    UpdatesModule,
  ],
  providers: [TournamentsService],
  exports: [TournamentsService],
  controllers: [TournamentsController],
})
export class TournamentsModule {}
