import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { FootballTournamentGeneralDto } from '../football/dto/football-tournament-general.dto';
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
      const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
      const email = tokenPayload.email;
      const user = await this.usersService.findUserByEmail(email, true);
      if (!user) {
        console.log('User not found');
        throw new UnauthorizedException('User not found');
      }
      const roles = user.userRoles.map((ur) => ur.role.name);

      if (!roles.includes('admin')) {
        throw new UnauthorizedException(
          'User does not have permission to access this route. Please contact the administrator.',
        );
      }

      return this.footballService.getCompetitions();
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
  async createTournament(@Body() body: { tournamentId: string }) {
    try {
      console.log('try to create tournament');
      console.log('body:', body);
      if (!body || !body.tournamentId)
        throw new Error('Tournament ID is required');
      console.log('tournament ID: ', body.tournamentId);
      const tournamentResponse = await this.tournamentsService.getTournament(
        body.tournamentId,
      );
      console.log('tournament data:', tournamentResponse);
      if (!tournamentResponse) throw new Error('Tournament not found');
      const data =
        (await tournamentResponse.json()) as FootballTournamentGeneralDto;
      const response = await this.tournamentsService.addNewTournament({
        external_id: data.id,
        name: data.name,
        // created_at: new Date(),
        // updated_at: new Date(),
        // source: 'football',
        // isActive: true,
      });
      console.log('tournament successfully created');
      return response;
    } catch (e) {
      console.log('ERROR:', (e as Error).message);
      throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST);
    }
  }
}
