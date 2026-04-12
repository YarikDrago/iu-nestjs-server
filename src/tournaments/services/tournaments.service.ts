import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Repository } from 'typeorm';
import { Tournaments } from '../entities/tournament.entity';
import { FootballService } from '../../football/football.service';
import { Seasons } from '../entities/seasons.entity';
import { Matches } from '../entities/matches.entity';
import { UpdatesService } from '../../updates/updates.service';
import { Group } from '../entities/group.entity';
import { randomBytes } from 'node:crypto';
import { GroupMembers } from '../entities/group_members.entity';
import { FootballMatchDto } from '../../football/dto/football-match.dto';
import { UpdatesGateway } from '../../updates/updates.gateway';

export type UpsertSeasonInput = {
  externalId: number;
  tournamentId: number;
  startDate: Date;
  endDate: Date;
  isCurrent?: boolean;
};

export type UpsertMatchInput = {
  externalId: number;
  seasonExternalId: number;
  tournamentExternalId: number;
  homeTeam: string; // name of the team
  awayTeam: string; // name of the team
  startTime: Date | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type UpsertGroupInput = {
  name: string;
  tournamentId: number;
  seasonId: number;
  ownerId: number;
};

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournaments)
    private readonly tournamentsRepo: Repository<Tournaments>,
    @InjectRepository(Seasons)
    private readonly seasonsRepo: Repository<Seasons>,
    @InjectRepository(Matches)
    private readonly matchesRepo: Repository<Matches>,
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMembers)
    private readonly groupMembersRepo: Repository<GroupMembers>,

    private readonly footballService: FootballService,
    private readonly updatesService: UpdatesService,
    private readonly updatesGateway: UpdatesGateway,
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

  /* */
  findChangedMatches(
    matchesFromApi: FootballMatchDto[],
    matchesFromDb: Matches[],
  ): FootballMatchDto[] {
    const changedMatches: FootballMatchDto[] = [];
    const dbMatchesByExternalId = new Map<number, Matches>();
    for (const dbMatch of matchesFromDb) {
      dbMatchesByExternalId.set(Number(dbMatch.external_id), dbMatch);
    }

    for (const match of matchesFromApi) {
      /* For testing of updates. DEV MODE ONLY!!! */
      // if (match.id == 537327) {
      //   this.manualMatchChange(match);
      // }

      const dbMatch = dbMatchesByExternalId.get(Number(match.id));
      const { homeScore, awayScore } = this.calculateMatchScore(match);
      const statusApi = match.status || '';
      const startTimeApi = new Date(match.utcDate);

      /* If the match is not in the database, it means that it has been "changed"/new */
      if (!dbMatch) {
        changedMatches.push(match);
        continue;
      }

      /* Compare with the existing match in the database */
      const isStatusChanged = (dbMatch.status || '') !== statusApi;
      const isHomeScoreChanged = (dbMatch.home_score ?? null) !== homeScore;
      const isAwayScoreChanged = (dbMatch.away_score ?? null) !== awayScore;

      const dbStartTime = dbMatch.start_time
        ? new Date(dbMatch.start_time)
        : null;
      const isStartTimeChanged =
        (dbStartTime?.getTime() ?? null) !== startTimeApi.getTime();

      /* Skip if nothing has changed */
      if (
        !isStatusChanged &&
        !isHomeScoreChanged &&
        !isAwayScoreChanged &&
        !isStartTimeChanged
      ) {
        continue;
      }

      /* Add the match to the list of changed matches if any of the following conditions are met */
      changedMatches.push(match);
    }

    return changedMatches;
  }

  async upsertMatches(inputs: UpsertMatchInput[]) {
    if (inputs.length === 0) {
      return { identifiers: [], generatedMaps: [], raw: [] };
    }

    /* Collect tournaments external IDs from the inputs */
    const tournamentExternalIds = Array.from(
      new Set(inputs.map((i) => i.tournamentExternalId)),
    );

    /* 1) Read tournaments by external_id (NO upsert) */
    const tournaments = await this.tournamentsRepo.find({
      select: { id: true, external_id: true },
      where: { external_id: In(tournamentExternalIds) },
    });

    /* Create a map of tournaments by external_id to internal ID */
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

    // 2) Read seasons by (tournament_id, external_id) (NO upsert)
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

    // 3) Upsert matches ONLY
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
        home_score: match.homeScore, // Score already calculated
        away_score: match.awayScore,
      };
    });

    return this.matchesRepo.upsert(rows, ['external_id']);
  }

  /* Update matches of all observable tournaments. */
  async updateMatchesOfCompetitions() {
    console.log('try to update matches of competitions (service)');
    const observableTournamentsDataDb =
      await this.getAllObservableTournaments(true);
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

    /* Extract matches that have been changed since the last update. */
    const updatedMatchesApi: FootballMatchDto[] = this.findChangedMatches(
      matchesFromCompetitionsApi(),
      competitionsMatchesDataDb,
    );

    const transformApiMatchesToDbMatches = (
      matches: FootballMatchDto[],
    ): UpsertMatchInput[] => {
      return matches.map((match) => {
        const statusApi = match.status || '';
        const startTimeApi = new Date(match.utcDate);
        const { homeScore, awayScore } = this.calculateMatchScore(match);

        return {
          externalId: Number(match.id),
          seasonExternalId: match.season.id,
          tournamentExternalId: match.competition.id,
          homeTeam: match.homeTeam.name || '',
          awayTeam: match.awayTeam.name || '',
          startTime: startTimeApi,
          status: statusApi,
          homeScore: homeScore,
          awayScore: awayScore,
        };
      });
    };

    const transformedApiMatches =
      transformApiMatchesToDbMatches(updatedMatchesApi);

    await this.upsertMatches(transformedApiMatches);

    this.updatesGateway.sendMatchesUpdate(transformedApiMatches);

    console.log('Matches were successfully updated!');
  }

  calculateMatchScore(match: FootballMatchDto) {
    const homeScore: number =
      (match.score.regularTime?.home || 0) + (match.score.extraTime?.home || 0);
    const awayScore: number =
      (match.score.regularTime?.away || 0) + (match.score.extraTime?.away || 0);
    return { homeScore, awayScore };
  }

  async addNewGroup(input: UpsertGroupInput): Promise<Group> {
    console.log('try to add new group (service)');
    const groupEntity = this.groupRepo.create({
      name: input.name,
      tournament_id: input.tournamentId,
      season_id: input.seasonId,
      owner_id: input.ownerId,
      invite_code: this.generateInviteCode(),
    });
    const group = await this.groupRepo.save(groupEntity);
    await this.addUserAsGroupMember(group.id, input.ownerId, 'verified');
    return group;
  }

  async findGroupByInviteCode(inviteCode: string) {
    console.log('try to find group by invite code (service)');
    return await this.groupRepo.findOne({
      where: { invite_code: inviteCode },
      relations: {
        owner: true,
      },
    });
  }

  async findGroupById(groupId: number, expanded: boolean = false) {
    console.log('try to find group by id (service)');
    const settings = {
      where: { id: groupId },
    };
    if (expanded) {
      settings['relations'] = {
        tournament: true,
        season: true,
        members: {
          user: true,
        },
      };
    }

    return await this.groupRepo.findOne(settings);
  }

  async findUserInGroup(groupId: number, userId: number) {
    console.log('try to find user in group (service)');
    return await this.groupMembersRepo.findOne({
      where: { group_id: groupId, user_id: userId },
    });
  }

  async addUserAsGroupMember(
    groupId: number,
    userId: number,
    status = 'unverified',
  ) {
    console.log('try to add user as group member (service)');
    const groupMemberEntity = this.groupMembersRepo.create({
      group_id: groupId,
      user_id: userId,
      status,
    });
    return await this.groupMembersRepo.save(groupMemberEntity);
  }

  async getUserGroups(userId: number): Promise<Group[]> {
    console.log('try to get my groups (service)', userId);
    /* Get groups where the user is owner or member. */
    const userInGroups = await this.groupMembersRepo.find({
      where: { user_id: userId },
      relations: { group: true },
    });
    console.log('userInGroups:', userInGroups);
    /* Get groups by their IDs. */
    const groupIds = userInGroups.map((g) => g.group_id);
    return await this.groupRepo.find({
      where: { id: In(groupIds) },
      relations: { tournament: true, season: true },
    });
  }

  async deleteGroupByOwner(groupId: number, userId: number) {
    console.log('try to delete group by owner (service)');
    console.log('groupId:', groupId, 'userId:', userId);
    const response = await this.groupRepo.delete({
      id: groupId,
      owner_id: userId,
    });
    if (response.affected === 0) {
      throw new NotFoundException('Group not found');
    }
    return true;
  }

  async updateGroup(groupId: number, newName: string, userId: number) {
    console.log('try to update group data (service)');
    const response = await this.groupRepo.update(
      { id: groupId, owner_id: userId },
      { name: newName },
    );
    if (response.affected === 0) {
      throw new NotFoundException('Group not found');
    }
    return true;
  }

  async updateGroupMember(groupId: number, userId: number, status: string) {
    console.log('try to update group member status (service)');
    const response = await this.groupMembersRepo.update(
      { group_id: groupId, user_id: userId },
      { status: status },
    );
    if (response.affected === 0) {
      throw new NotFoundException('Group member not found');
    }
    return true;
  }

  async deleteGroupMember(groupId: number, userId: number) {
    console.log('try to delete group member (service)');
    const response = await this.groupMembersRepo.delete({
      group_id: groupId,
      user_id: userId,
    });
    if (response.affected === 0) {
      throw new NotFoundException('Group member not found');
    }
    return true;
  }

  async updateGroupInviteCode(groupId: number, userId: number) {
    console.log('try to update group invite code (service)');
    const response = await this.groupRepo.update(
      { id: groupId, owner_id: userId },
      { invite_code: this.generateInviteCode() },
    );
    if (response.affected === 0) {
      throw new NotFoundException('Group not found');
    }
  }

  generateInviteCode(length = 10): string {
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    if (length < 4 || length > 50) {
      throw new Error('Invite code length must be between 4 and 50');
    }

    const bytes = randomBytes(length);
    let code = '';

    for (let i = 0; i < length; i += 1) {
      code += alphabet[bytes[i] % alphabet.length];
    }

    return code;
  }

  async getCompetitionMatches(competionId: number, seasonId: number) {
    console.log(
      'try to get matches for competition:',
      competionId,
      'season:',
      seasonId,
    );
    const matches = this.matchesRepo.find({
      where: { tournament_id: competionId, season_id: seasonId },
    });

    return matches;
  }

  // TODO rename Matches to Match
  /* This function is used for testing.
   * Simulates a change in the match. */
  manualMatchChange(match: FootballMatchDto) {
    const generateNewScore = () => {
      const randomScore = Math.floor(Math.random() * 10);
      return randomScore;
    };
    match.score.regularTime = {
      home: generateNewScore(),
      away: generateNewScore(),
    };
    match.score.extraTime = {
      home: generateNewScore(),
      away: generateNewScore(),
    };
  }
}
