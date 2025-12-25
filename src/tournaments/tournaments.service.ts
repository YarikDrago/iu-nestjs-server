import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournaments } from './entities/tournament.entity';
import { FootballService } from '../football/football.service';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournaments)
    private readonly tournamentsRepo: Repository<Tournaments>,

    private readonly footballService: FootballService,
  ) {}

  async getAllTournaments() {
    return await this.tournamentsRepo.find();
  }

  async getTournament(externalId: string) {
    console.log('try to get tournaments (service)');
    const response = await this.footballService.getCompetitionData(externalId);
    return response;
  }

  async addNewTournament(payload: Omit<Tournaments, 'id'>) {
    console.log('try to add new tournament (service)');
    const tournament = this.tournamentsRepo.create(payload);
    return await this.tournamentsRepo.save(tournament);
  }
}
