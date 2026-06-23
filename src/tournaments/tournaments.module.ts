import { TournamentsService } from './services/tournaments.service';
import { forwardRef, Module } from '@nestjs/common';
import { FootballModule } from '../football/football.module';
import { TournamentsController } from './tournaments.controller';
import { TournamentGroupNotificationsController } from './tournament-group-notifications.controller';
import { TournamentGroupsController } from './tournament-groups.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournaments } from './entities/tournament.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { Seasons } from './entities/seasons.entity';
import { Matches } from './entities/matches.entity';
import { UpdatesModule } from '../updates/updates.module';
import { Group } from './entities/group.entity';
import { GroupMembers } from './entities/group_members.entity';
import { MailModule } from '../mail/mail.module';
import { Predictions } from './entities/predictions.entity';
import { TournamentsPredictionsService } from './services/tournaments_predictions.service';
import { GroupMemberNotificationSettings } from './entities/group_member_notification_settings.entity';
import { TournamentUserNotificationSettings } from './entities/tournament_user_notification_settings.entity';
import { TournamentNotificationService } from './services/tournament_notification.service';
import { GroupMemberRoleNames } from './entities/group_member_role_names.entity';
import { TelegramModule } from '../telegram/telegram.module';
import { TournamentsGroupService } from './services/tournaments_group.service';
import { TournamentsMatchesService } from './services/tournaments_matches.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tournaments,
      Seasons,
      Matches,
      Group,
      GroupMembers,
      GroupMemberRoleNames,
      GroupMemberNotificationSettings,
      TournamentUserNotificationSettings,
      Predictions,
    ]),
    FootballModule,
    AuthModule,
    UsersModule,
    UpdatesModule,
    MailModule,
    forwardRef(() => TelegramModule),
  ],
  providers: [
    TournamentsService,
    TournamentsGroupService,
    TournamentsMatchesService,
    TournamentsPredictionsService,
    TournamentNotificationService,
  ],
  exports: [
    TournamentsService,
    TournamentsGroupService,
    TournamentsMatchesService,
    TournamentsPredictionsService,
    TournamentNotificationService,
  ],
  controllers: [
    TournamentGroupNotificationsController,
    TournamentGroupsController,
    TournamentsController,
  ],
})
export class TournamentsModule {}
