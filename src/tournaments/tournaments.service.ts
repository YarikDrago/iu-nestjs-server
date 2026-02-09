import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournaments } from './entities/tournament.entity';
import { FootballService } from '../football/football.service';
import { Seasons } from './entities/seasons.entity';

export type UpsertSeasonInput = {
  externalId: number;
  tournamentId: number;
  startDate: Date;
  endDate: Date;
  isCurrent?: boolean;
};

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournaments)
    private readonly tournamentsRepo: Repository<Tournaments>,
    @InjectRepository(Seasons)
    private readonly seasonsRepo: Repository<Seasons>,

    private readonly footballService: FootballService,
  ) {}

  async getAllTournaments() {
    return await this.tournamentsRepo.find();
  }

  async getAllObservableTournaments() {
    return await this.tournamentsRepo.find({ where: { isObservable: true } });
  }

  async getTournament(externalId: string) {
    console.log('try to get tournaments (service)');
    const response =
      await this.footballService.getCompetitionMatches(externalId);
    return response;
  }

  async findTournamentInDbById(externalId: number) {
    console.log('try to find tournament in DB (service)');
    return await this.tournamentsRepo.findOne({
      where: { external_id: externalId },
    });
  }

  async addNewTournament(payload: Omit<Tournaments, 'id'>) {
    console.log('try to add new tournament (service)');
    const tournament = this.tournamentsRepo.create(payload);
    return await this.tournamentsRepo.save(tournament);
  }

  async deleteTournament(externalId: number) {
    console.log('try to delete tournament (service)');
    return await this.tournamentsRepo.delete({
      external_id: externalId,
    });
  }

  async updateTournamentObservableStatusByExternalId(
    externalId: number,
    isObservable: boolean,
  ) {
    console.log('try to update tournament observable status (service)');
    return await this.tournamentsRepo.update(
      { external_id: externalId },
      { isObservable: isObservable },
    );
  }

  async updateSeasonsOfCompetitions() {
    const observableTournaments = await this.getAllObservableTournaments();

    const competitionsApiData = await Promise.all(
      observableTournaments.map((tournament) =>
        this.footballService.getCompetition(String(tournament.external_id)),
      ),
    );

    const tournamentsGlossary: { [key: number]: number } = {};

    observableTournaments.forEach((tournament) => {
      tournamentsGlossary[tournament.external_id] = tournament.id;
    });

    const preparedSeasons: UpsertSeasonInput[] = [];

    competitionsApiData.forEach((competition) => {
      const currentSeasonId = competition.currentSeason.id;
      for (const season of competition.seasons) {
        const preparedSeason: UpsertSeasonInput = {
          externalId: season.id,
          tournamentId: tournamentsGlossary[competition.id],
          startDate: new Date(season.startDate),
          endDate: new Date(season.endDate),
          isCurrent: currentSeasonId === season.id,
        };
        preparedSeasons.push(preparedSeason);
      }
    });

    const response = await this.upsertSeasons(preparedSeasons);
    console.log('Seasons successfully updated.');

    return response;
  }

  async upsertSeason(input: UpsertSeasonInput) {
    return this.seasonsRepo.upsert(
      {
        external_id: input.externalId,
        tournament_id: input.tournamentId,
        start_date: input.startDate,
        end_date: input.endDate,
        is_current: input.isCurrent ?? false,
      },
      ['external_id'],
    );
  }

  async upsertSeasons(inputs: UpsertSeasonInput[]) {
    if (inputs.length === 0)
      return { identifiers: [], generatedMaps: [], raw: [] };

    return this.seasonsRepo.upsert(
      inputs.map((input) => ({
        external_id: input.externalId,
        tournament_id: input.tournamentId,
        start_date: input.startDate,
        end_date: input.endDate,
        is_current: input.isCurrent ?? false,
      })),
      ['external_id'],
    );
  }
}
