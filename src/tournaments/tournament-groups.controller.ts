import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { GroupMemberStatus } from './entities/group_members.entity';
import { TournamentsGroupService } from './services/tournaments_group.service';
import { TournamentsMatchesService } from './services/tournaments_matches.service';
import { TournamentsPredictionsService } from './services/tournaments_predictions.service';

@Controller('tournaments')
export class TournamentGroupsController {
  constructor(
    private readonly tournamentsGroupService: TournamentsGroupService,
    private readonly tournamentsMatchesService: TournamentsMatchesService,
    private readonly tournamentsPredictionsService: TournamentsPredictionsService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  @Get('groups')
  async getUserGroups(@Req() req: Request) {
    try {
      console.log('try to get user groups (controller)');
      this.authService.checkAccessTokenFromRequest(req);
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const user = await this.usersService.findUserByEmail(tokenPayload.email);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const groups = await this.tournamentsGroupService.getUserGroups(user.id);

      return groups.map((group) => ({
        id: group.id,
        name: group.name,
        isOwner: group.owner_id === user.id,
        ownerId: group.owner_id,
        tournament: group.tournament,
        season: group.season,
        createdAt: group.created_at,
      }));
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

  @Patch('groups/:groupId/members/:userId')
  async updateGroupMember(
    @Req() req: Request,
    @Param('groupId') groupId: number,
    @Param('userId') userId: number,
    @Body() body: { status: GroupMemberStatus | 'delete' },
  ) {
    try {
      console.log(
        'try to update group member status (controller)',
        body.status,
      );
      this.authService.checkAccessTokenFromRequest(req);
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const requester = await this.usersService.findUserByEmail(
        tokenPayload.email,
      );

      if (
        body.status !== 'delete' &&
        !Object.values(GroupMemberStatus).includes(body.status)
      ) {
        throw new BadRequestException({
          message: 'Invalid status',
          code: 'BAD_REQUEST',
        });
      }

      if (!requester) {
        throw new UnauthorizedException('User not found');
      }

      const member = await this.usersService.findUserById(userId);

      if (!member) {
        throw new BadRequestException('Member not found');
      }

      const group = await this.tournamentsGroupService.findGroupById(
        groupId,
        true,
      );

      if (!group) {
        throw new BadRequestException('Group not found');
      }

      const requesterId = Number(requester.id);
      const memberId = Number(userId);
      const groupOwnerId = Number(group.owner_id);

      const isGroupOwner = requesterId === groupOwnerId;
      const isSelfLeave =
        requesterId === memberId && body.status === GroupMemberStatus.Left;

      if (!isGroupOwner && !isSelfLeave) {
        throw new UnauthorizedException(
          'You can only leave group or manage members as owner',
        );
      }

      if (isGroupOwner && isSelfLeave) {
        throw new BadRequestException(
          'Owner cannot leave own group. Transfer ownership or delete group',
        );
      }

      if (body.status === 'delete') {
        await this.tournamentsGroupService.deleteGroupMember(groupId, userId);
        console.log(
          'User with ID:',
          userId,
          'was successfully deleted from group with ID:',
        );
        return true;
      }

      await this.tournamentsGroupService.updateGroupMember(
        groupId,
        userId,
        body.status,
      );

      if (body.status === GroupMemberStatus.Verified) {
        this.mailService.sendUserApprovedStatusJoinGroup(
          member.email,
          group.name,
        );
      }

      return true;
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

  @Patch('groups/:groupId')
  async renameGroup(
    @Req() req: Request,
    @Param('groupId') groupId: number,
    @Body() body: { name: string },
  ) {
    try {
      console.log('try to rename group (controller)');
      this.authService.checkAccessTokenFromRequest(req);
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const user = await this.usersService.findUserByEmail(tokenPayload.email);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const group = await this.tournamentsGroupService.findGroupById(
        groupId,
        true,
      );

      if (!group) {
        throw new BadRequestException({
          message: 'Group not found',
          code: 'BAD_REQUEST',
        });
      }

      if (group.owner_id !== user.id) {
        throw new UnauthorizedException('You are not owner of this group');
      }

      return this.tournamentsGroupService.updateGroup(
        groupId,
        body.name,
        user.id,
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

  @Patch('groups/:groupId/invite-code')
  async changeInviteCode(
    @Req() req: Request,
    @Param('groupId') groupId: number,
  ) {
    try {
      console.log('try to change invite code (controller)');
      this.authService.checkAccessTokenFromRequest(req);
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const user = await this.usersService.findUserByEmail(tokenPayload.email);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const group = await this.tournamentsGroupService.findGroupById(
        groupId,
        true,
      );
      if (user.id !== group?.owner_id) {
        throw new UnauthorizedException('You are not owner of this group');
      }

      const newInviteCode =
        await this.tournamentsGroupService.updateGroupInviteCode(
          groupId,
          user.id,
        );
      return { inviteCode: newInviteCode };
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

  @Get('groups/:groupId')
  async getGroupById(@Req() req: Request, @Param('groupId') groupId: number) {
    try {
      console.log('try to get group by ID (controller)');
      this.authService.checkAccessTokenFromRequest(req);
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const user = await this.usersService.findUserByEmail(tokenPayload.email);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      console.log('group id:', groupId);

      const group = await this.tournamentsGroupService.findGroupById(
        groupId,
        true,
      );

      if (!group) {
        throw new BadRequestException({
          message: 'Group not found',
          code: 'BAD_REQUEST',
        });
      }

      return {
        id: group.id,
        name: group.name,
        isOwner: group.owner_id === user.id,
        ownerId: group.owner_id,
        inviteCode: group.invite_code,
        tournament: group.tournament,
        season: group.season,
        createdAt: group.created_at,
        members: group.members.map((member) => ({
          id: member.id,
          user_id: member.user_id,
          status: member.status,
          nickname: member.user?.nickname,
        })),
      };
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

  @Get('groups/:groupId/predictions')
  async getGroupPredictions(
    @Req() req: Request,
    @Param('groupId') groupId: number,
  ) {
    try {
      console.log('try to get group predictions (controller)');
      this.authService.checkAccessTokenFromRequest(req);
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const user = await this.usersService.findUserByEmail(tokenPayload.email);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const group = await this.tournamentsGroupService.findGroupById(
        groupId,
        true,
      );

      if (!group) {
        throw new BadRequestException({
          message: 'Group not found',
          code: 'BAD_REQUEST',
        });
      }

      if (!group.members.find((member) => member.user_id === user.id)) {
        throw new UnauthorizedException('You are not member of this group');
      }

      const matches =
        await this.tournamentsMatchesService.getCompetitionMatches(
          group.tournament_id,
          group.season_id,
        );

      const predictions =
        await this.tournamentsPredictionsService.getGroupPredictions(groupId);

      return {
        group: {
          id: group.id,
          name: group.name,
          members: group.members
            .filter((member) => member.status === GroupMemberStatus.Verified)
            .map((member) => ({
              id: member.id,
              user_id: member.user_id,
              nickname: member.user?.nickname,
            })),
          tournament: group.tournament,
          season: group.season,
        },
        predictions: predictions,
        matches: matches,
      };
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

  @Post('groups/:groupId/predictions')
  async upsertPrediction(
    @Req() req: Request,
    @Param('groupId') groupId: number,
    @Body() body: { matchId: number; homeScore: number; awayScore: number },
  ) {
    try {
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const user = await this.usersService.findUserByEmail(tokenPayload.email);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!body || !body.matchId || !body.homeScore || !body.awayScore) {
        throw new BadRequestException({
          message: 'Match ID, home score, and away score are required',
          code: 'BAD_REQUEST',
        });
      }

      if (
        isNaN(Number(body.homeScore)) ||
        isNaN(Number(body.awayScore)) ||
        Number(body.homeScore) < 0 ||
        Number(body.awayScore) < 0
      ) {
        throw new BadRequestException({
          message: 'Home score and away score must be numbers and >= 0',
        });
      }

      return await this.tournamentsPredictionsService.upsertPrediction(
        user.id,
        groupId,
        body.matchId,
        body.homeScore,
        body.awayScore,
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

  @Delete('groups/:groupId')
  async deleteGroupByOwner(
    @Req() req: Request,
    @Param('groupId') groupId: number,
  ) {
    try {
      console.log('try to delete group by owner (controller)');
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const user = await this.usersService.findUserByEmail(tokenPayload.email);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      await this.tournamentsGroupService.deleteGroupByOwner(groupId, user.id);
      console.log('Group was successfully deleted!');
      return true;
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

  @Post('groups/join')
  async joinGroupByLink(@Req() req: Request, @Query('code') code: string) {
    try {
      console.log('try to join group by link (controller)');
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const user = await this.usersService.findUserByEmail(tokenPayload.email);
      console.log('user:', user);
      console.log('code:', code);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!code) {
        throw new BadRequestException({
          message: 'Code is required',
          code: 'BAD_REQUEST',
        });
      }

      const group =
        await this.tournamentsGroupService.findGroupByInviteCode(code);

      if (!group) {
        throw new BadRequestException({
          message: 'Invalid code',
          code: 'BAD_REQUEST',
        });
      }

      console.log('group:', group.id);
      console.log('user:', user.id);

      const userFromGroup = await this.tournamentsGroupService.findUserInGroup(
        group.id,
        user.id,
      );

      if (userFromGroup) {
        throw new BadRequestException({
          message: 'User already in group',
          code: 'BAD_REQUEST',
        });
      }

      await this.tournamentsGroupService.addUserAsGroupMember(
        group.id,
        user.id,
      );

      await this.mailService.sendJoinToGroupRequestForCheck(
        group.owner.email,
        user.nickname,
        group.name,
      );

      console.log('User successfully joined group.');
      return true;
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

  @Post(':externalId/groups')
  async createNewGroup(
    @Req() req: Request,
    @Param('externalId') tournamentExternalId: string,
    @Body() body: { name: string; seasonExternalId: number },
  ) {
    try {
      console.log('try to add new group (controller)');
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const user = await this.usersService.findUserByEmail(tokenPayload.email);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!body || !body.name || !body.seasonExternalId) {
        throw new BadRequestException({
          message: 'Name and season ID are required',
          code: 'BAD_REQUEST',
        });
      }

      const response = await this.tournamentsGroupService.addNewGroup({
        name: body.name,
        tournamentId: Number(tournamentExternalId),
        seasonId: body.seasonExternalId,
        ownerId: user.id,
      });

      console.log('response:', response);

      return true;
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
