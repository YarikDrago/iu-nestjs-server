import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FootballMatchDto } from '../../football/dto/football-match.dto';
import { FootballService } from '../../football/football.service';
import { UpdatesGateway } from '../../updates/updates.gateway';
import { ManualUpdateMatchDto } from '../dto/manual-update-match.dto';
import { MatchResponseDto } from '../dto/match-response.dto';
import { Matches, MatchStatus } from '../entities/matches.entity';
import { Seasons } from '../entities/seasons.entity';
import { Tournaments } from '../entities/tournament.entity';
import { TournamentNotificationService } from './tournament_notification.service';

export type UpsertMatchInput = {
  externalId: number;
  seasonExternalId: number;
  tournamentExternalId: number;
  homeTeam: string;
  awayTeam: string;
  startTime: Date | null;
  status: MatchStatus | null;
  homeScore: number | null;
  awayScore: number | null;
  hidePredictions?: boolean;
};

export type MatchChangeReason = 'status' | 'score' | 'other';

export type ChangedFootballMatchDto = FootballMatchDto & {
  changeReason: MatchChangeReason;
  isStatusChanged: boolean;
  isScoreChanged: boolean;
  previousStatus: MatchStatus | null;
  previousHomeScore: number | null;
  previousAwayScore: number | null;
  apiHomeScore: number | null;
  apiAwayScore: number | null;
  homeScore: number | null;
  awayScore: number | null;
};

type ManualMatchUpdate = {
  home_team?: string | null;
  away_team?: string | null;
  start_time?: Date | null;
  status?: MatchStatus | null;
  home_score?: number | null;
  away_score?: number | null;
  hide_predictions?: boolean;
};

@Injectable()
export class TournamentsMatchesService {
  constructor(
    @InjectRepository(Tournaments)
    private readonly tournamentsRepo: Repository<Tournaments>,
    @InjectRepository(Seasons)
    private readonly seasonsRepo: Repository<Seasons>,
    @InjectRepository(Matches)
    private readonly matchesRepo: Repository<Matches>,

    private readonly footballService: FootballService,
    private readonly updatesGateway: UpdatesGateway,
    private readonly tournamentNotificationService: TournamentNotificationService,
  ) {}

  async getTournamentWithMatchesById(tournamentId: number) {
    const tournament = await this.tournamentsRepo.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const activeSeason = await this.seasonsRepo.findOne({
      where: { tournament_id: tournamentId, is_current: true },
    });

    if (!activeSeason) {
      throw new NotFoundException('Active season not found');
    }

    const matches = await this.matchesRepo.find({
      where: { tournament_id: tournamentId, season_id: activeSeason.id },
      order: {
        start_time: 'ASC',
        id: 'ASC',
      },
    });

    return {
      ...tournament,
      season: activeSeason,
      matches: matches.map((match) => this.toMatchResponseDto(match)),
    };
  }

  async getMatchesOfCurrentSeasonsForObservableTournaments(): Promise<
    Matches[]
  > {
    return this.matchesRepo
      .createQueryBuilder('m')
      .innerJoin(Seasons, 's', 's.id = m.season_id')
      .innerJoin(Tournaments, 't', 't.id = m.tournament_id')
      .where('s.is_current = :isCurrent', { isCurrent: true })
      .andWhere('t.isObservable = :isObservable', { isObservable: true })
      .getMany();
  }

  findChangedMatches(
    matchesFromApi: FootballMatchDto[],
    matchesFromDb: Matches[],
  ): ChangedFootballMatchDto[] {
    const changedMatches: ChangedFootballMatchDto[] = [];
    const dbMatchesByExternalId = new Map<number, Matches>();
    for (const dbMatch of matchesFromDb) {
      dbMatchesByExternalId.set(Number(dbMatch.external_id), dbMatch);
    }

    for (const match of matchesFromApi) {
      const dbMatch = dbMatchesByExternalId.get(Number(match.id));
      const { homeScore: apiHomeScore, awayScore: apiAwayScore } =
        this.calculateMatchScore(match);
      const statusApi = this.parseMatchStatus(match.status);
      const homeTeamApi = match.homeTeam.name || '';
      const awayTeamApi = match.awayTeam.name || '';
      const startTimeApi = new Date(match.utcDate);

      if (!dbMatch) {
        const changedMatch: ChangedFootballMatchDto = {
          ...match,
          changeReason: 'other',
          isStatusChanged: false,
          isScoreChanged: false,
          previousStatus: null,
          previousHomeScore: null,
          previousAwayScore: null,
          apiHomeScore,
          apiAwayScore,
          homeScore: apiHomeScore,
          awayScore: apiAwayScore,
        };
        changedMatches.push(changedMatch);
        this.logChangedMatch(changedMatch);
        continue;
      }

      const homeScore = this.getMaxScoreValue(apiHomeScore, dbMatch.home_score);
      const awayScore = this.getMaxScoreValue(apiAwayScore, dbMatch.away_score);
      const isStatusChanged = (dbMatch.status ?? null) !== statusApi;
      const isHomeTeamChanged = (dbMatch.home_team || '') !== homeTeamApi;
      const isAwayTeamChanged = (dbMatch.away_team || '') !== awayTeamApi;
      const isHomeScoreChanged = (dbMatch.home_score ?? null) !== homeScore;
      const isAwayScoreChanged = (dbMatch.away_score ?? null) !== awayScore;
      const isScoreChanged = isHomeScoreChanged || isAwayScoreChanged;

      const dbStartTime = dbMatch.start_time
        ? new Date(dbMatch.start_time)
        : null;
      const isStartTimeChanged =
        (dbStartTime?.getTime() ?? null) !== startTimeApi.getTime();

      if (
        !isStatusChanged &&
        !isHomeTeamChanged &&
        !isAwayTeamChanged &&
        !isHomeScoreChanged &&
        !isAwayScoreChanged &&
        !isStartTimeChanged
      ) {
        continue;
      }

      const changeReason: MatchChangeReason = isScoreChanged
        ? 'score'
        : isStatusChanged
          ? 'status'
          : 'other';

      const changedMatch: ChangedFootballMatchDto = {
        ...match,
        changeReason,
        isStatusChanged,
        isScoreChanged,
        previousStatus: dbMatch.status ?? null,
        previousHomeScore: dbMatch.home_score ?? null,
        previousAwayScore: dbMatch.away_score ?? null,
        apiHomeScore,
        apiAwayScore,
        homeScore,
        awayScore,
      };

      changedMatches.push(changedMatch);
      this.logChangedMatch(changedMatch, dbMatch);
    }

    return changedMatches;
  }

  async upsertMatches(inputs: UpsertMatchInput[]) {
    if (inputs.length === 0) {
      return { identifiers: [], generatedMaps: [], raw: [] };
    }

    const tournamentExternalIds = Array.from(
      new Set(inputs.map((i) => i.tournamentExternalId)),
    );

    const tournaments = await this.tournamentsRepo.find({
      select: { id: true, external_id: true },
      where: { external_id: In(tournamentExternalIds) },
    });

    const tournamentIdByExternal = new Map<number, number>(
      tournaments.map((t: Tournaments) => [t.external_id, t.id]),
    );

    const missingTournamentExternalIds = tournamentExternalIds.filter(
      (extId) => !tournamentIdByExternal.has(extId),
    );
    if (missingTournamentExternalIds.length > 0) {
      throw new NotFoundException(
        `Tournaments not found for external_id: ${missingTournamentExternalIds.join(
          ', ',
        )}`,
      );
    }

    const requiredSeasonKeys = Array.from(
      new Set(
        inputs.map((i) => {
          const tournamentId = tournamentIdByExternal.get(
            i.tournamentExternalId,
          )!;
          return `${tournamentId}:${i.seasonExternalId}`;
        }),
      ),
    );

    const tournamentIds = Array.from(
      new Set(
        inputs.map((i) => tournamentIdByExternal.get(i.tournamentExternalId)!),
      ),
    );
    const seasonExternalIds = Array.from(
      new Set(inputs.map((i) => i.seasonExternalId)),
    );

    const seasons = await this.seasonsRepo.find({
      select: { id: true, external_id: true, tournament_id: true },
      where: {
        tournament_id: In(tournamentIds),
        external_id: In(seasonExternalIds),
      },
    });

    const seasonIdByTournamentIdAndExternal = new Map<string, number>(
      seasons.map((s: Seasons) => [
        `${s.tournament_id}:${s.external_id}`,
        s.id,
      ]),
    );

    const missingSeasonKeys = requiredSeasonKeys.filter(
      (k) => !seasonIdByTournamentIdAndExternal.has(k),
    );
    if (missingSeasonKeys.length > 0) {
      throw new NotFoundException(
        `Seasons not found for keys (tournament_id:season_external_id): ${missingSeasonKeys.join(
          ', ',
        )}`,
      );
    }

    const rows = inputs.map((match) => {
      const tournamentId = tournamentIdByExternal.get(
        match.tournamentExternalId,
      );
      if (!tournamentId) {
        throw new BadRequestException(
          `Internal error: tournamentId not resolved for external_id=${match.tournamentExternalId}`,
        );
      }

      const seasonKey = `${tournamentId}:${match.seasonExternalId}`;
      const seasonId = seasonIdByTournamentIdAndExternal.get(seasonKey);
      if (!seasonId) {
        throw new BadRequestException(
          `Internal error: seasonId not resolved for key=${seasonKey}`,
        );
      }

      return {
        external_id: match.externalId,
        tournament_id: tournamentId,
        season_id: seasonId,
        home_team: match.homeTeam,
        away_team: match.awayTeam,
        start_time: match.startTime,
        status: match.status,
        home_score: match.homeScore,
        away_score: match.awayScore,
      };
    });

    return this.matchesRepo.upsert(rows, ['external_id']);
  }

  async updateMatchesOfCompetitions() {
    console.log('try to update matches of competitions (service)');
    const observableTournamentsDataDb = await this.tournamentsRepo.find({
      where: { isObservable: true },
    });
    const observableTournamentsExternalIds = observableTournamentsDataDb.map(
      (t) => String(t.external_id),
    );

    const [competitionsMatchesDataApi, competitionsMatchesDataDb] =
      await Promise.all([
        this.footballService.getCompetitionMatches(
          observableTournamentsExternalIds,
        ),
        this.getMatchesOfCurrentSeasonsForObservableTournaments(),
      ]);

    const matchesFromCompetitionsApi = (): FootballMatchDto[] => {
      const matches: FootballMatchDto[] = [];
      for (const competition of competitionsMatchesDataApi) {
        matches.push(...competition.matches);
      }
      return matches;
    };

    const updatedMatchesApi: ChangedFootballMatchDto[] =
      this.findChangedMatches(
        matchesFromCompetitionsApi(),
        competitionsMatchesDataDb,
      );

    const transformApiMatchesToDbMatches = (
      matches: ChangedFootballMatchDto[],
    ): UpsertMatchInput[] => {
      return matches.map((match) => {
        const statusApi = this.parseMatchStatus(match.status);
        const startTimeApi = new Date(match.utcDate);

        return {
          externalId: Number(match.id),
          seasonExternalId: match.season.id,
          tournamentExternalId: match.competition.id,
          homeTeam: match.homeTeam.name || '',
          awayTeam: match.awayTeam.name || '',
          startTime: startTimeApi,
          status: statusApi,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
        };
      });
    };

    const transformedApiMatches =
      transformApiMatchesToDbMatches(updatedMatchesApi);

    await this.upsertMatches(transformedApiMatches);

    await this.notifyChangedMatches(updatedMatchesApi);

    this.updatesGateway.sendMatchesUpdate(transformedApiMatches);

    console.log('Matches were successfully updated!');
  }

  calculateMatchScore(match: FootballMatchDto) {
    let homeScore: number | null = null;
    let awayScore: number | null = null;
    if (match.score.halfTime.home !== null) {
      homeScore = Math.max(
        match.score.halfTime.home,
        match.score.fullTime.home || 0,
      );
    }
    if (match.score.halfTime.away !== null) {
      awayScore = Math.max(
        match.score.halfTime.away,
        match.score.fullTime.away || 0,
      );
    }
    if (match.score.regularTime && match.score.extraTime) {
      homeScore =
        (match.score.regularTime?.home || 0) +
        (match.score.extraTime?.home || 0);
      awayScore =
        (match.score.regularTime?.away || 0) +
        (match.score.extraTime?.away || 0);
    }
    return { homeScore, awayScore };
  }

  async getCompetitionMatches(
    competionId: number,
    seasonId: number,
  ): Promise<MatchResponseDto[]> {
    console.log(
      'try to get matches for competition:',
      competionId,
      'season:',
      seasonId,
    );
    const matches = this.matchesRepo.find({
      where: { tournament_id: competionId, season_id: seasonId },
    });

    return (await matches).map((match) => this.toMatchResponseDto(match));
  }

  async manuallyUpdateMatch(matchId: number, dto: ManualUpdateMatchDto) {
    const match = await this.matchesRepo.findOne({
      where: { id: matchId },
      relations: { season: true, tournament: true },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const update = this.normalizeManualMatchUpdate(dto);

    if (Object.keys(update).length === 0) {
      throw new BadRequestException({
        message: 'No match fields provided for update',
        code: 'BAD_REQUEST',
      });
    }

    const hasStatusUpdate = this.hasManualMatchUpdateKey(update, 'status');
    const hasHomeScoreUpdate = this.hasManualMatchUpdateKey(
      update,
      'home_score',
    );
    const hasAwayScoreUpdate = this.hasManualMatchUpdateKey(
      update,
      'away_score',
    );
    const isStatusChanged =
      hasStatusUpdate && (match.status ?? null) !== (update.status ?? null);
    const isScoreChanged =
      (hasHomeScoreUpdate &&
        (match.home_score ?? null) !== (update.home_score ?? null)) ||
      (hasAwayScoreUpdate &&
        (match.away_score ?? null) !== (update.away_score ?? null));
    const previousStatus = match.status ?? null;
    const previousHomeScore = match.home_score ?? null;
    const previousAwayScore = match.away_score ?? null;

    Object.assign(match, update);
    const savedMatch = await this.matchesRepo.save(match);

    if (isStatusChanged) {
      await this.tournamentNotificationService.notifyMatchStatusChanged({
        tournamentExternalId: Number(match.tournament.external_id),
        tournamentName: match.tournament.name,
        homeTeam: savedMatch.home_team ?? '',
        awayTeam: savedMatch.away_team ?? '',
        previousStatus,
        status: savedMatch.status,
      });
    }

    if (isScoreChanged) {
      await this.tournamentNotificationService.notifyMatchScoreChanged({
        tournamentExternalId: Number(match.tournament.external_id),
        tournamentName: match.tournament.name,
        homeTeam: savedMatch.home_team ?? '',
        awayTeam: savedMatch.away_team ?? '',
        previousHomeScore,
        previousAwayScore,
        homeScore: savedMatch.home_score,
        awayScore: savedMatch.away_score,
      });
    }

    this.updatesGateway.sendMatchesUpdate([
      {
        externalId: Number(savedMatch.external_id),
        seasonExternalId: Number(match.season.external_id),
        tournamentExternalId: Number(match.tournament.external_id),
        homeTeam: savedMatch.home_team ?? '',
        awayTeam: savedMatch.away_team ?? '',
        startTime: savedMatch.start_time,
        status: savedMatch.status,
        homeScore: savedMatch.home_score,
        awayScore: savedMatch.away_score,
        hidePredictions: savedMatch.hide_predictions,
      },
    ]);

    return savedMatch;
  }

  private logChangedMatch(match: ChangedFootballMatchDto, dbMatch?: Matches) {
    const logData: Record<string, unknown> = {
      match: `${match.homeTeam.name || ''} - ${match.awayTeam.name || ''}`,
      externalId: match.id,
      reason: match.changeReason,
    };

    if (match.changeReason === 'score') {
      logData.score = {
        db: {
          home: dbMatch?.home_score ?? null,
          away: dbMatch?.away_score ?? null,
        },
        apiCalculated: {
          home: match.apiHomeScore,
          away: match.apiAwayScore,
        },
        resolvedForDb: {
          home: match.homeScore,
          away: match.awayScore,
        },
      };
    } else if (match.changeReason === 'status') {
      logData.status = {
        db: dbMatch?.status ?? null,
        api: match.status || '',
      };
    } else {
      logData.fields = {
        db: dbMatch
          ? {
              homeTeam: dbMatch.home_team || '',
              awayTeam: dbMatch.away_team || '',
              startTime: dbMatch.start_time,
              status: dbMatch.status || '',
              score: {
                home: dbMatch.home_score ?? null,
                away: dbMatch.away_score ?? null,
              },
            }
          : null,
        api: {
          homeTeam: match.homeTeam.name || '',
          awayTeam: match.awayTeam.name || '',
          startTime: new Date(match.utcDate),
          status: match.status || '',
          scoreCalculated: {
            home: match.apiHomeScore,
            away: match.apiAwayScore,
          },
          scoreResolvedForDb: {
            home: match.homeScore,
            away: match.awayScore,
          },
        },
      };
    }

    console.log('changed match:', logData);
  }

  private toMatchResponseDto(match: Matches): MatchResponseDto {
    return {
      ...match,
      hide_predictions: match.hide_predictions,
    };
  }

  private async notifyChangedMatches(matches: ChangedFootballMatchDto[]) {
    for (const match of matches) {
      const notificationChange = {
        tournamentExternalId: Number(match.competition.id),
        tournamentName: match.competition.name,
        homeTeam: match.homeTeam.name || '',
        awayTeam: match.awayTeam.name || '',
        previousStatus: match.previousStatus,
        status: this.parseMatchStatus(match.status),
        previousHomeScore: match.previousHomeScore,
        previousAwayScore: match.previousAwayScore,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      };

      if (match.isStatusChanged) {
        await this.tournamentNotificationService.notifyMatchStatusChanged(
          notificationChange,
        );
      }

      if (match.isScoreChanged) {
        await this.tournamentNotificationService.notifyMatchScoreChanged(
          notificationChange,
        );
      }
    }
  }

  private getMaxScoreValue(
    apiScore: number | null,
    dbScore: number | null,
  ): number | null {
    if (apiScore === null) {
      return dbScore;
    }

    if (dbScore === null) {
      return apiScore;
    }

    return Math.max(apiScore, dbScore);
  }

  private normalizeManualMatchUpdate(
    dto: ManualUpdateMatchDto,
  ): ManualMatchUpdate {
    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException({
        message: 'Request body is required',
        code: 'BAD_REQUEST',
      });
    }

    const update: ManualMatchUpdate = {};

    const homeTeam = this.pickManualUpdateValue(dto, 'homeTeam', 'home_team');
    if (homeTeam.exists) {
      update.home_team = this.normalizeNullableString(
        homeTeam.value,
        'homeTeam',
      );
    }

    const awayTeam = this.pickManualUpdateValue(dto, 'awayTeam', 'away_team');
    if (awayTeam.exists) {
      update.away_team = this.normalizeNullableString(
        awayTeam.value,
        'awayTeam',
      );
    }

    const startTime = this.pickManualUpdateValue(
      dto,
      'startTime',
      'start_time',
    );
    if (startTime.exists) {
      update.start_time = this.normalizeNullableDate(
        startTime.value,
        'startTime',
      );
    }

    const status = this.pickManualUpdateValue(dto, 'status');
    if (status.exists) {
      update.status = this.parseMatchStatus(status.value as string | null);
    }

    const homeScore = this.pickManualUpdateValue(
      dto,
      'homeScore',
      'home_score',
    );
    if (homeScore.exists) {
      update.home_score = this.normalizeNullableScore(
        homeScore.value,
        'homeScore',
      );
    }

    const awayScore = this.pickManualUpdateValue(
      dto,
      'awayScore',
      'away_score',
    );
    if (awayScore.exists) {
      update.away_score = this.normalizeNullableScore(
        awayScore.value,
        'awayScore',
      );
    }

    const hidePredictions = this.pickManualUpdateValue(
      dto,
      'hidePredictions',
      'hide_predictions',
    );
    if (hidePredictions.exists) {
      update.hide_predictions = this.normalizeBoolean(
        hidePredictions.value,
        'hidePredictions',
      );
    }

    return update;
  }

  private pickManualUpdateValue(
    dto: ManualUpdateMatchDto,
    primaryKey: keyof ManualUpdateMatchDto,
    fallbackKey?: keyof ManualUpdateMatchDto,
  ): { exists: boolean; value: unknown } {
    if (Object.prototype.hasOwnProperty.call(dto, primaryKey)) {
      return { exists: true, value: dto[primaryKey] };
    }

    if (fallbackKey && Object.prototype.hasOwnProperty.call(dto, fallbackKey)) {
      return { exists: true, value: dto[fallbackKey] };
    }

    return { exists: false, value: undefined };
  }

  private hasManualMatchUpdateKey(
    update: ManualMatchUpdate,
    key: keyof ManualMatchUpdate,
  ): boolean {
    return Boolean(Object.prototype.hasOwnProperty.call(update, key));
  }

  private normalizeNullableString(value: unknown, fieldName: string) {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string or null`);
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length > 255) {
      throw new BadRequestException(`${fieldName} must be 255 characters max`);
    }

    return trimmedValue;
  }

  private normalizeNullableDate(value: unknown, fieldName: string) {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string' && !(value instanceof Date)) {
      throw new BadRequestException(`${fieldName} must be an ISO date or null`);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return date;
  }

  private normalizeNullableScore(value: unknown, fieldName: string) {
    if (value === null) {
      return null;
    }

    const score = Number(value);
    if (!Number.isInteger(score) || score < 0) {
      throw new BadRequestException(
        `${fieldName} must be an integer greater than or equal to 0, or null`,
      );
    }

    return score;
  }

  private normalizeBoolean(value: unknown, fieldName: string) {
    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${fieldName} must be a boolean`);
    }

    return value;
  }

  private parseMatchStatus(
    status: string | null | undefined,
  ): MatchStatus | null {
    if (!status) {
      return null;
    }

    if (Object.values(MatchStatus).includes(status as MatchStatus)) {
      return status as MatchStatus;
    }

    throw new BadRequestException(`Unknown match status: ${status}`);
  }
}
