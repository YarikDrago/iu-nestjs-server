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
import { TournamentsService } from './services/tournaments.service';
import { AuthService } from '../auth/auth.service';
import type { Request } from 'express';
import { FootballService } from '../football/football.service';
import { UsersService } from '../users/users.service';
import { FootballCompetitionMatchesDto } from '../football/dto/football-competition-matches.dto';
import { MailService } from '../mail/mail.service';
import { TournamentsPredictionsService } from './services/tournaments_predictions.service';

@Controller('tournaments')
export class TournamentsController {
  constructor(
    private readonly tournamentsService: TournamentsService,
    private readonly tournamentsPredictionsService: TournamentsPredictionsService,
    private readonly footballService: FootballService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  /* Get all tournaments from the API. */
  @Get('api')
  async showAllTournamentsApi(@Req() req: Request) {
    try {
      console.log('try to show all tournaments from API (controller)');

      await this.authService.checkUserRolesByRequest(req, ['admin']);

      const apiCompetitions = await this.footballService.getCompetitions();
      const dbCompetitions = await this.tournamentsService.getAllTournaments();

      apiCompetitions.competitions.forEach((competition) => {
        /* Add default states for each competition. */
        competition.inDb = false;
        competition.isObservable = false;
        const dbCompetition = dbCompetitions.find(
          (comp) => comp.external_id === competition.id,
        );
        if (dbCompetition !== undefined) {
          competition.inDb = true;
          competition.isObservable = dbCompetition.isObservable;
        }
      });

      return apiCompetitions;
    } catch (e) {
      console.log('error:', e);
      throw e;
    }
  }

  @Get('api/competitions/:id')
  async getCompetitionById(
    @Req() req: Request,
    @Param('id') competitionId: string,
  ): Promise<FootballCompetitionMatchesDto> {
    try {
      console.log('try to GET a competition from API (controller)');
      await this.authService.checkUserRolesByRequest(req, ['admin']);

      if (!competitionId)
        throw new BadRequestException({
          message: 'Competition ID is required',
          code: 'BAD_REQUEST',
        });

      return (
        await this.footballService.getCompetitionMatches([competitionId])
      )[0];
    } catch (e) {
      console.log('error:', e);
      throw e;
    }
  }

  /* Show all available and active tournaments from DB */
  @Get('')
  async showAllTournaments(@Req() req: Request) {
    try {
      console.log('try to show all tournaments');

      this.authService.checkAccessTokenFromRequest(req);

      const response =
        await this.tournamentsService.getObservableTournamentsWithCurrentSeason();
      console.log('tournaments data:', response);
      return response;
    } catch (e) {
      console.log('error:', e);

      // TODO FIX
      if (e instanceof HttpException) {
        throw e;
      }

      throw new HttpException(
        (e as Error).message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('add')
  async createTournament(
    @Req() req: Request,
    @Body() body: { competitionId: string },
  ) {
    try {
      console.log('try to add tournament');

      this.authService.checkAccessTokenFromRequest(req);
      await this.authService.checkUserRolesByRequest(req, ['admin']);

      console.log('body:', body);
      if (!body || !body.competitionId)
        throw new Error('Tournament ID is required');
      console.log('tournament ID: ', body.competitionId);
      const competitionExternalId = body.competitionId;
      if (!competitionExternalId)
        throw new BadRequestException({
          message: 'Tournament ID is required',
          code: 'BAD_REQUEST',
        });

      if (isNaN(Number(competitionExternalId)))
        throw new Error('Invalid tournament ID');

      /* try to find tournament in the DB. If it exists, throw an error. */
      const dbResponse = await this.tournamentsService.findTournamentInDbById(
        Number(competitionExternalId),
      );
      console.log('tournament data:', dbResponse);

      if (dbResponse !== null) {
        throw new Error('Tournament already exists in DB.');
      }
      console.log('tournament does not exist in DB.');

      const tournamentResponse = await this.footballService.getCompetition(
        competitionExternalId,
      );

      const response = await this.tournamentsService.addNewTournament({
        external_id: Number(competitionExternalId),
        name: tournamentResponse.name,
        isObservable: false,
      });

      console.log('Response:', response);

      return response;
    } catch (e) {
      console.log('ERROR:', (e as Error).message);
      if (e instanceof HttpException) {
        throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST);
      }
    }
  }

  @Delete(':externalId')
  async deleteTournament(
    @Req() req: Request,
    @Param('externalId') externalId: string,
  ) {
    try {
      console.log('try to delete tournament:', externalId);
      this.authService.checkAccessTokenFromRequest(req);
      await this.authService.checkUserRolesByRequest(req, ['admin']);
      const response = await this.tournamentsService.deleteTournament(
        Number(externalId),
      );
      console.log('response:', response);
      return response;
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

  @Patch('seasons')
  async updateSeasons(@Req() req: Request) {
    try {
      console.log('try to update seasons');
      this.authService.checkAccessTokenFromRequest(req);
      await this.authService.checkUserRolesByRequest(req, ['admin']);

      return this.tournamentsService.updateSeasonsOfCompetitions();
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

  @Patch('matches')
  async updateMatches(@Req() req: Request) {
    try {
      console.log('try to update matches');
      this.authService.checkAccessTokenFromRequest(req);
      await this.authService.checkUserRolesByRequest(req, ['admin']);

      await this.tournamentsService.updateMatchesOfCompetitions();
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

      const groups = await this.tournamentsService.getUserGroups(user.id);

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
    @Body() body: { status: string },
  ) {
    try {
      console.log(
        'try to update group member status (controller)',
        body.status,
      );
      this.authService.checkAccessTokenFromRequest(req);
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const owner = await this.usersService.findUserByEmail(tokenPayload.email);

      // TODO change status to enum
      if (
        !['verified', 'unverified', 'suspended', 'delete'].includes(body.status)
      ) {
        throw new BadRequestException({
          message: 'Invalid status',
          code: 'BAD_REQUEST',
        });
      }

      if (!owner) {
        throw new UnauthorizedException('User not found');
      }

      const member = await this.usersService.findUserById(userId);

      if (!member) {
        throw new BadRequestException('Member not found');
      }

      const group = await this.tournamentsService.findGroupById(groupId, true);
      if (owner.id !== group?.owner_id) {
        throw new UnauthorizedException('You are not owner of this group');
      }

      if (body.status === 'delete') {
        await this.tournamentsService.deleteGroupMember(groupId, userId);
        console.log(
          'User with ID:',
          userId,
          'was successfully deleted from group with ID:',
        );
        return true;
      }

      await this.tournamentsService.updateGroupMember(
        groupId,
        userId,
        body.status,
      );

      if (body.status === 'verified') {
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

      const group = await this.tournamentsService.findGroupById(groupId, true);

      if (!group) {
        throw new BadRequestException({
          message: 'Group not found',
          code: 'BAD_REQUEST',
        });
      }

      if (group.owner_id !== user.id) {
        throw new UnauthorizedException('You are not owner of this group');
      }

      return this.tournamentsService.updateGroup(groupId, body.name, user.id);
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

      await this.tournamentsService.updateGroupInviteCode(groupId, user.id);
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

      const group = await this.tournamentsService.findGroupById(groupId, true);

      if (!group) {
        throw new BadRequestException({
          message: 'Group not found',
          code: 'BAD_REQUEST',
        });
      }

      /* Attach email info only to each user and remove user entity from the group. */
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

      /* Check if user is member of the group. */
      const group = await this.tournamentsService.findGroupById(groupId, true);

      if (!group) {
        throw new BadRequestException({
          message: 'Group not found',
          code: 'BAD_REQUEST',
        });
      }

      if (!group.members.find((member) => member.user_id === user.id)) {
        throw new UnauthorizedException('You are not member of this group');
      }

      const matches = await this.tournamentsService.getCompetitionMatches(
        group.tournament_id,
        group.season_id,
      );

      const predictions =
        await this.tournamentsPredictionsService.getGroupPredictions(groupId);

      // TODO prepare data for frontend

      // return predictions;
      return {
        group: {
          id: group.id,
          name: group.name,
          members: group.members
            .filter((member) => member.status === 'verified')
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

      await this.tournamentsService.deleteGroupByOwner(groupId, user.id);
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

      const group = await this.tournamentsService.findGroupByInviteCode(code);

      if (!group) {
        throw new BadRequestException({
          message: 'Invalid code',
          code: 'BAD_REQUEST',
        });
      }

      console.log('group:', group.id);
      console.log('user:', user.id);

      const userFromGroup = await this.tournamentsService.findUserInGroup(
        group.id,
        user.id,
      );

      if (userFromGroup) {
        throw new BadRequestException({
          message: 'User already in group',
          code: 'BAD_REQUEST',
        });
      }

      await this.tournamentsService.addUserAsGroupMember(group.id, user.id);

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

      const response = await this.tournamentsService.addNewGroup({
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

  // MUST BE IN THE VERY END OF THE FILE!!!
  @Patch(':externalId')
  async updateTournamentObservableStatusByExternalId(
    @Req() req: Request,
    @Param('externalId') externalId: string,
    @Body() body: { isObservable: boolean },
  ) {
    try {
      console.log('try to update tournament observable status by external ID');
      this.authService.checkAccessTokenFromRequest(req);
      await this.authService.checkUserRolesByRequest(req, ['admin']);
      const response =
        await this.tournamentsService.updateTournamentObservableStatusByExternalId(
          Number(externalId),
          body.isObservable,
        );
      console.log('response:', response);
      return response;
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
