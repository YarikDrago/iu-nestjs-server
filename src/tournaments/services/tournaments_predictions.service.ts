import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Predictions } from '../entities/predictions.entity';
import { Repository } from 'typeorm';
import { Matches } from '../entities/matches.entity';
import { GroupMembers } from '../entities/group_members.entity';

@Injectable()
export class TournamentsPredictionsService {
  constructor(
    @InjectRepository(Matches)
    private readonly matchesRepo: Repository<Matches>,
    @InjectRepository(GroupMembers)
    private readonly groupMembersRepo: Repository<GroupMembers>,
    @InjectRepository(Predictions)
    private readonly predictionsRepo: Repository<Predictions>,
  ) {}

  async getGroupPredictions(groupId: number) {
    console.log('try to get predictions for group:', groupId);
    const predictions = await this.predictionsRepo.find({
      where: { group_id: groupId },
      // relations: { match: true },
    });
    // console.log('predictions:', predictions);
    return predictions;
  }

  async upsertPrediction(
    userId: number,
    groupId: number,
    matchId: number,
    homeScore: number,
    awayScore: number,
  ) {
    console.log('try to upsert prediction (service)');

    /* Check if the match exists */
    const match = await this.matchesRepo.findOne({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    /* Check if the user is a member of the group */
    const membership = await this.groupMembersRepo.findOne({
      where: { user_id: userId, group_id: groupId, status: 'verified' },
    });
    if (!membership) {
      throw new UnauthorizedException(
        'User is not a verified member of this group',
      );
    }

    /* Check if the match has started */
    if (match.start_time && new Date(match.start_time) < new Date()) {
      throw new BadRequestException('Cannot predict after match has started');
    }

    return await this.predictionsRepo.upsert(
      {
        user_id: userId,
        group_id: groupId,
        match_id: matchId,
        home_score: homeScore,
        away_score: awayScore,
      },
      ['user_id', 'group_id', 'match_id'],
    );
  }
}
