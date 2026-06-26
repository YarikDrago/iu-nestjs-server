import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Repository } from 'typeorm';
import { FootballCompetitionTeamsResponseDto } from '../../football/dto/football-competition-teams-response.dto';
import { FootballTeamDto } from '../../football/dto/football-team.dto';
import { FootballService } from '../../football/football.service';
import { Seasons } from '../entities/seasons.entity';
import { Sports } from '../entities/sports.entity';
import { Teams } from '../entities/teams.entity';
import { Tournaments } from '../entities/tournament.entity';

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
    @InjectRepository(Sports)
    private readonly sportsRepo: Repository<Sports>,
    @InjectRepository(Teams)
    private readonly teamsRepo: Repository<Teams>,

    private readonly footballService: FootballService,
  ) {}

  async getAllTournaments() {
    return await this.tournamentsRepo.find();
  }

  async getAllObservableTournaments(isExtended = false) {
    const options: FindManyOptions<Tournaments> = {
      where: { isObservable: true },
    };
    if (isExtended) {
      //
    }
    return await this.tournamentsRepo.find(options);
  }

  async getObservableTournamentsWithCurrentSeason() {
    return this.tournamentsRepo
      .createQueryBuilder('t')
      .leftJoinAndMapOne(
        't.currentSeason',
        Seasons,
        's',
        's.tournament_id = t.id AND s.is_current = :isCurrent',
        { isCurrent: true },
      )
      .where('t.isObservable = :isObservable', { isObservable: true })
      .orderBy('t.id', 'ASC')
      .getMany();
  }

  async findTournamentInDbById(externalId: number) {
    console.log('try to find tournament in DB (service)');
    return await this.tournamentsRepo.findOne({
      where: { external_id: externalId },
    });
  }

  async addNewTournament(payload: Omit<Tournaments, 'id' | 'seasons'>) {
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

    await this.updateTeamsOfCompetitions(observableTournaments);

    return response;
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

  private async updateTeamsOfCompetitions(tournaments: Tournaments[]) {
    const tournamentExternalIds = tournaments.map((tournament) =>
      String(tournament.external_id),
    );
    const competitionTeams = await this.footballService.getCompetitionTeams(
      tournamentExternalIds,
    );

    const footballSport = await this.getOrCreateFootballSport();
    const validCompetitionTeams =
      await this.filterCompetitionTeamsWithExistingTournamentSeason(
        competitionTeams,
      );
    const teams = validCompetitionTeams.flatMap((competition) =>
      competition.teams.map((team) => this.toTeamUpsertData(team)),
    );
    const uniqueTeams = Array.from(
      new Map(
        teams.filter((team) => team.name).map((team) => [team.name, team]),
      ).values(),
    );

    if (uniqueTeams.length === 0) {
      console.log('No competition teams to update.');
      return;
    }

    const existingTeams = await this.teamsRepo.find({
      where: {
        sport_id: footballSport.id,
        name: In(uniqueTeams.map((team) => team.name)),
      },
    });
    const existingTeamByName = new Map<string, Teams>(
      existingTeams.map((team) => [team.name, team]),
    );

    await this.teamsRepo.upsert(
      uniqueTeams.map((team) => {
        const existingTeam = existingTeamByName.get(team.name);

        return {
          sport_id: footballSport.id,
          name: team.name,
          short_name: team.short_name ?? existingTeam?.short_name ?? null,
          tla: team.tla ?? existingTeam?.tla ?? null,
          crest: team.crest ?? existingTeam?.crest ?? null,
        };
      }),
      ['sport_id', 'name'],
    );

    console.log('Competition teams successfully updated.');
  }

  private async filterCompetitionTeamsWithExistingTournamentSeason(
    competitionTeams: FootballCompetitionTeamsResponseDto[],
  ) {
    if (competitionTeams.length === 0) {
      return [];
    }

    const tournamentExternalIds = competitionTeams.map(
      (competition) => competition.competition.id,
    );

    const tournaments = await this.tournamentsRepo.find({
      select: { id: true, external_id: true },
      where: { external_id: In(tournamentExternalIds) },
    });
    const tournamentIdByExternalId = new Map<number, number>(
      tournaments.map((tournament) => [tournament.external_id, tournament.id]),
    );

    const seasons = await this.seasonsRepo.find({
      select: { id: true, tournament_id: true },
      where: {
        tournament_id: In(tournaments.map((tournament) => tournament.id)),
      },
    });
    const tournamentIdsWithSeasons = new Set(
      seasons.map((season) => season.tournament_id),
    );

    return competitionTeams.filter((competition) => {
      const tournamentId = tournamentIdByExternalId.get(
        competition.competition.id,
      );

      return (
        tournamentId !== undefined && tournamentIdsWithSeasons.has(tournamentId)
      );
    });
  }

  private toTeamUpsertData(team: FootballTeamDto) {
    return {
      name: team.name,
      short_name: team.shortName,
      tla: team.tla,
      crest: team.crest,
    };
  }

  private async getOrCreateFootballSport(): Promise<Sports> {
    const existingSport = await this.sportsRepo.findOne({
      where: { name: 'football' },
    });

    if (existingSport) {
      return existingSport;
    }

    return this.sportsRepo.save({ name: 'football' });
  }
}
