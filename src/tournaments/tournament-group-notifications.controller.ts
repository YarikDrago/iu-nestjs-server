import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { TournamentNotificationService } from './services/tournament_notification.service';

@Controller('tournaments')
export class TournamentGroupNotificationsController {
  constructor(
    private readonly tournamentNotificationService: TournamentNotificationService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get('groups/:groupId/notification-settings')
  async getGroupMemberNotificationSettings(
    @Req() req: Request,
    @Param('groupId') groupId: number,
  ) {
    try {
      console.log('try to get group member notification settings (controller)');
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const user = await this.usersService.findUserByEmail(tokenPayload.email);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const settings =
        await this.tournamentNotificationService.getGroupMemberNotificationSettings(
          Number(groupId),
          user.id,
        );

      return settings.notificationSettings;
    } catch (e) {
      console.log('ERROR:', (e as Error).message);

      if (e instanceof HttpException) {
        throw e;
      }

      throw new HttpException(
        (e as Error)?.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('groups/:groupId/notification-settings')
  async updateGroupMemberNotificationSettings(
    @Req() req: Request,
    @Param('groupId') groupId: number,
    @Body()
    body: {
      notifyPredictionReminder?: boolean;
      notify_prediction_reminder?: boolean;
    },
  ) {
    try {
      console.log(
        'try to update group member notification settings (controller)',
      );
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const user = await this.usersService.findUserByEmail(tokenPayload.email);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const value =
        body?.notifyPredictionReminder ?? body?.notify_prediction_reminder;

      if (typeof value !== 'boolean') {
        throw new BadRequestException({
          message: 'notifyPredictionReminder must be boolean',
          code: 'BAD_REQUEST',
        });
      }

      return await this.tournamentNotificationService.updateGroupMemberNotificationSetting(
        Number(groupId),
        user.id,
        'notifyPredictionReminder',
        value,
      );
    } catch (e) {
      console.log('ERROR:', (e as Error).message);

      if (e instanceof HttpException) {
        throw e;
      }

      throw new HttpException(
        (e as Error)?.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
