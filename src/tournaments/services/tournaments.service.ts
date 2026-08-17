import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Repository } from 'typeorm';
import { FootballCompetitionTeamsResponseDto } from '../../football/dto/football-competition-teams-response.dto';
import { FootballCompetitionDto } from '../../football/dto/football-competition.dto';
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
  emblem?: string | null;
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

  async getTournamentsStats() {
    const [total, observable] = await Promise.all([
      this.tournamentsRepo.count(),
      this.tournamentsRepo.count({ where: { isObservable: true } }),
    ]);

    return { total, observable };
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
    const competitionsApiData = await this.footballService.getCompetitions();
    const tournaments = await this.upsertTournamentsFromCompetitions(
      competitionsApiData.competitions,
    );
    const tournamentsGlossary =
      this.createTournamentIdByExternalId(tournaments);

    const preparedSeasons: UpsertSeasonInput[] = [];

    competitionsApiData.competitions.forEach((competition) => {
      const tournamentId = tournamentsGlossary.get(competition.id);

      if (tournamentId === undefined || !competition.currentSeason) {
        return;
      }

      preparedSeasons.push({
        externalId: competition.currentSeason.id,
        tournamentId,
        startDate: new Date(competition.currentSeason.startDate),
        endDate: new Date(competition.currentSeason.endDate),
        emblem: competition.currentSeason.emblem ?? competition.emblem ?? null,
        isCurrent: true,
      });
    });

    const tournamentIdsToReset = preparedSeasons.map(
      (season) => season.tournamentId,
    );
    const response = await this.upsertSeasons(preparedSeasons, {
      resetCurrentForTournamentIds: tournamentIdsToReset,
    });
    console.log('Seasons successfully updated.');

    const observableTournaments = await this.getAllObservableTournaments();
    await this.updateTeamsOfCompetitions(observableTournaments);

    return response;
  }

  async backfillSeasonsOfAllCompetitions(requestsPerMinute = 5) {
    if (requestsPerMinute <= 0) {
      throw new Error('requestsPerMinute must be greater than 0');
    }

    const requestIntervalMs = Math.ceil(60_000 / requestsPerMinute);
    const tournamentsBefore = await this.getTournamentsStats();
    const competitionsApiData = await this.footballService.getCompetitions();
    let lastApiRequestAt = Date.now();

    const competitions = competitionsApiData.competitions;
    console.log(
      `Football API returned ${competitions.length} competitions: ${competitions
        .map((competition) => competition.id)
        .join(', ')}`,
    );

    const tournaments =
      await this.upsertTournamentsFromCompetitions(competitions);
    const tournamentsAfterInitialSync = await this.getTournamentsStats();

    console.log(
      `Tournaments synced. Total before: ${tournamentsBefore.total}, total after: ${tournamentsAfterInitialSync.total}, observable: ${tournamentsAfterInitialSync.observable}.`,
    );

    const tournamentsGlossary =
      this.createTournamentIdByExternalId(tournaments);

    let successfulCompetitions = 0;
    const failedCompetitionIds: number[] = [];
    let preparedSeasonsCount = 0;

    for (const competition of competitions) {
      await this.waitForNextApiRequest(lastApiRequestAt, requestIntervalMs);
      lastApiRequestAt = Date.now();

      try {
        const competitionDetails = await this.footballService.getCompetition(
          String(competition.id),
        );
        const refreshedTournaments =
          await this.upsertTournamentsFromCompetitions([competitionDetails]);
        const tournamentId =
          refreshedTournaments[0]?.id ??
          tournamentsGlossary.get(competition.id);

        if (tournamentId === undefined) {
          throw new Error(`Tournament was not found in DB: ${competition.id}`);
        }

        tournamentsGlossary.set(competition.id, tournamentId);

        const preparedSeasons = this.prepareSeasonsFromCompetition(
          competitionDetails,
          tournamentId,
        );
        preparedSeasonsCount += preparedSeasons.length;

        await this.upsertSeasons(preparedSeasons, {
          resetCurrentForTournamentIds: [tournamentId],
        });

        successfulCompetitions++;
        console.log(
          `Backfilled seasons for competition ${competition.id} (${successfulCompetitions}/${competitions.length}).`,
        );
      } catch (e) {
        failedCompetitionIds.push(competition.id);
        console.error(
          `Failed to backfill seasons for competition ${competition.id}:`,
          e,
        );
      }
    }

    return {
      competitions: competitions.length,
      competitionIds: competitions.map((competition) => competition.id),
      successfulCompetitions,
      failedCompetitionIds,
      preparedSeasons: preparedSeasonsCount,
      requestsPerMinute,
      tournamentsBefore,
      tournamentsAfter: await this.getTournamentsStats(),
    };
  }

  async upsertSeasons(
    inputs: UpsertSeasonInput[],
    options?: { resetCurrentForTournamentIds?: number[] },
  ) {
    if (inputs.length === 0)
      return { identifiers: [], generatedMaps: [], raw: [] };

    const resetTournamentIds = Array.from(
      new Set(options?.resetCurrentForTournamentIds ?? []),
    );

    if (resetTournamentIds.length > 0) {
      await this.seasonsRepo.update(
        { tournament_id: In(resetTournamentIds), is_current: true },
        { is_current: false },
      );
    }

    const existingSeasons = await this.seasonsRepo.find({
      select: { external_id: true, emblem: true },
      where: { external_id: In(inputs.map((input) => input.externalId)) },
    });
    const existingEmblemByExternalId = new Map(
      existingSeasons
        .filter((season) => season.emblem)
        .map((season) => [season.external_id, season.emblem]),
    );

    return this.seasonsRepo
      .createQueryBuilder()
      .insert()
      .into(Seasons)
      .values(
        inputs.map((input) => ({
          external_id: input.externalId,
          tournament_id: input.tournamentId,
          start_date: input.startDate,
          end_date: input.endDate,
          emblem:
            existingEmblemByExternalId.get(input.externalId) ??
            input.emblem ??
            null,
          is_current: input.isCurrent ?? false,
        })),
      )
      .orUpdate(
        ['tournament_id', 'start_date', 'end_date', 'emblem', 'is_current'],
        ['external_id'],
      )
      .updateEntity(false)
      .execute();
  }

  private async upsertTournamentsFromCompetitions(
    competitions: FootballCompetitionDto[],
  ) {
    if (competitions.length === 0) {
      return [];
    }

    const externalIds = competitions.map((competition) => competition.id);
    const existingTournaments = await this.tournamentsRepo.find({
      where: { external_id: In(externalIds) },
    });
    const existingTournamentByExternalId = new Map<number, Tournaments>(
      existingTournaments.map((tournament) => [
        tournament.external_id,
        tournament,
      ]),
    );

    await this.tournamentsRepo
      .createQueryBuilder()
      .insert()
      .into(Tournaments)
      .values(
        competitions.map((competition) => {
          const existingTournament = existingTournamentByExternalId.get(
            competition.id,
          );

          return {
            external_id: competition.id,
            name: competition.name,
            isObservable: existingTournament?.isObservable ?? false,
          };
        }),
      )
      .orUpdate(['name', 'isObservable'], ['external_id'])
      .updateEntity(false)
      .execute();

    return this.tournamentsRepo.find({
      where: { external_id: In(externalIds) },
    });
  }

  private prepareSeasonsFromCompetition(
    competition: FootballCompetitionDto,
    tournamentId: number,
  ): UpsertSeasonInput[] {
    const seasons = competition.seasons ?? [competition.currentSeason];
    const currentSeasonId = competition.currentSeason.id;

    return seasons.map((season) => ({
      externalId: season.id,
      tournamentId,
      startDate: new Date(season.startDate),
      endDate: new Date(season.endDate),
      emblem: season.emblem ?? competition.emblem ?? null,
      isCurrent: currentSeasonId === season.id,
    }));
  }

  private createTournamentIdByExternalId(tournaments: Tournaments[]) {
    return new Map(
      tournaments.map((tournament) => [tournament.external_id, tournament.id]),
    );
  }

  private async waitForNextApiRequest(
    lastApiRequestAt: number,
    requestIntervalMs: number,
  ) {
    const elapsedMs = Date.now() - lastApiRequestAt;
    const delayMs = requestIntervalMs - elapsedMs;

    if (delayMs <= 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
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
