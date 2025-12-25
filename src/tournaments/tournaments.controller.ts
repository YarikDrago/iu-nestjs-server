import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { FootballTournamentDto } from '../football/dto/football-tournament.dto';

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get('')
  async showAllTournaments() {
    try {
      console.log('try to show all tournaments');
      const response = await this.tournamentsService.getAllTournaments();
      console.log('tournaments data:', response);
      const data = response.map((tournament) => ({
        name: tournament.name,
        isActive: tournament.isActive,
      }));
      return data;
    } catch (e) {
      console.log('ERROR:', (e as Error).message);
      throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST);
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
      const data = (await tournamentResponse.json()) as FootballTournamentDto;
      if (!tournamentResponse) throw new Error('Tournament not found');
      const response = await this.tournamentsService.addNewTournament({
        external_id: data.id,
        name: data.name,
        created_at: new Date(),
        updated_at: new Date(),
        source: 'football',
        isActive: true,
      });
      console.log('tournament successfully created');
      return response;
    } catch (e) {
      console.log('ERROR:', (e as Error).message);
      throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST);
    }
  }
}
