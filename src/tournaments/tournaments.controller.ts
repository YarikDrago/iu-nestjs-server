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
  Req,
} from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { AuthService } from '../auth/auth.service';
import type { Request } from 'express';
import { FootballService } from '../football/football.service';
import { UsersService } from '../users/users.service';
import { FootballCompetitionMatchesDto } from '../football/dto/football-competition-matches.dto';

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

  // MUST BE IN THE VERY END OF THE FILE!!!
  @Patch(':externalId')
  async updateTournamentObservableStatusByExternalId(
    @Req() req: Request,
    @Param('externalId') externalId: string,
    @Body() body: { isObservable: boolean },
  ) {
    try {
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
