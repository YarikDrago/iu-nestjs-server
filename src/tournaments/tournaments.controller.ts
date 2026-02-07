import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { AuthService } from '../auth/auth.service';
import type { Request } from 'express';
import { FootballService } from '../football/football.service';
import { UsersService } from '../users/users.service';

@Controller('tournaments')
export class TournamentsController {
  constructor(
    private readonly tournamentsService: TournamentsService,
    private readonly footballService: FootballService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
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
  ) {
    try {
      console.log('try to GET a competition from API (controller)');
      await this.authService.checkUserRolesByRequest(req, ['admin']);

      if (!competitionId)
        throw new BadRequestException({
          message: 'Competition ID is required',
          code: 'BAD_REQUEST',
        });

      return await this.footballService.getCompetitionData(competitionId);
    } catch (e) {
      console.log('error:', e);
      throw e;
    }
  }

  @Get('')
  async showAllTournaments(@Req() req: Request) {
    try {
      console.log('try to show all tournaments');

      this.authService.checkAccessTokenFromRequest(req);

      const response = await this.tournamentsService.getAllTournaments();
      console.log('tournaments data:', response);
      const data = response.map((tournament) => ({
        name: tournament.name,
        // isActive: tournament.isActive,
      }));
      return data;
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
      const competitionId = body.competitionId;
      if (!competitionId)
        throw new BadRequestException({
          message: 'Tournament ID is required',
          code: 'BAD_REQUEST',
        });

      if (isNaN(Number(competitionId)))
        throw new Error('Invalid tournament ID');

      /* try to find tournament in the DB. If it exists, throw an error. */
      const dbResponse = await this.tournamentsService.findTournamentInDbById(
        Number(competitionId),
      );
      console.log('tournament data:', dbResponse);

      if (dbResponse !== null) {
        throw new Error('Tournament already exists in DB.');
      }
      console.log('tournament does not exist in DB.');

      const tournamentResponse =
        await this.footballService.getCompetitionData(competitionId);

      const response = await this.tournamentsService.addNewTournament({
        external_id: Number(competitionId),
        name: tournamentResponse.competition.name,
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
}
