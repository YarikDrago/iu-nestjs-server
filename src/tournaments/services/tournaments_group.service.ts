import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { Group } from '../entities/group.entity';
import {
  GroupMembers,
  GroupMemberStatus,
} from '../entities/group_members.entity';
import { TournamentNotificationService } from './tournament_notification.service';

export type UpsertGroupInput = {
  name: string;
  tournamentId: number;
  seasonId: number;
  ownerId: number;
};

@Injectable()
export class TournamentsGroupService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMembers)
    private readonly groupMembersRepo: Repository<GroupMembers>,

    private readonly tournamentNotificationService: TournamentNotificationService,
  ) {}

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
    await this.addUserAsGroupMember(
      group.id,
      input.ownerId,
      GroupMemberStatus.Verified,
    );
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
    status = GroupMemberStatus.Unverified,
  ) {
    console.log('try to add user as group member (service)');
    const groupMemberEntity = this.groupMembersRepo.create({
      group_id: groupId,
      user_id: userId,
      status,
    });

    return await this.groupMembersRepo.manager.transaction(async (manager) => {
      const groupMember = await manager.save(GroupMembers, groupMemberEntity);

      await this.tournamentNotificationService.createGroupMemberNotificationSettings(
        groupMember.id,
        manager,
      );

      return groupMember;
    });
  }

  async getUserGroups(userId: number): Promise<Group[]> {
    console.log('try to get my groups (service)', userId);
    /* Get groups where the user is owner or verified member. */
    const userInGroups = await this.groupMembersRepo.find({
      // TODO replace hardcoded value with constant
      where: { user_id: userId, status: GroupMemberStatus.Verified },
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

  async updateGroupMember(
    groupId: number,
    userId: number,
    status: GroupMemberStatus,
  ) {
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
    const newInviteCode = this.generateInviteCode();
    const response = await this.groupRepo.update(
      { id: groupId, owner_id: userId },
      { invite_code: newInviteCode },
    );
    if (response.affected === 0) {
      throw new NotFoundException('Group not found');
    }
    return newInviteCode;
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
}
