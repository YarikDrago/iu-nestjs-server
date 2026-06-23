import {
  BadRequestException,
  Logger,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  GroupMembers,
  GroupMemberStatus,
} from '../entities/group_members.entity';
import { GroupMemberNotificationSettings } from '../entities/group_member_notification_settings.entity';
import { TournamentUserNotificationSettings } from '../entities/tournament_user_notification_settings.entity';
import { Tournaments } from '../entities/tournament.entity';
import { TelegramService } from '../../telegram/telegram.service';
import { MatchStatus } from '../entities/matches.entity';

export type GroupMemberNotificationSettingsData = {
  groupMemberId: number;
  groupId: number;
  userId: number;
  memberStatus: GroupMemberStatus;
  notificationSettings: {
    notifyPredictionChanged: boolean;
  };
  updatedAt: Date;
};

export type GroupMemberNotificationSettingKey = 'notifyPredictionReminder';

export type TournamentUserNotificationSettingsData = {
  tournamentId: number;
  userId: number;
  notificationSettings: {
    notifyMatchStatusChanged: boolean;
    notifyMatchScoreChanged: boolean;
  };
  updatedAt: Date;
};

export type MatchNotificationChange = {
  tournamentExternalId: number;
  tournamentName: string;
  homeTeam: string;
  awayTeam: string;
  previousStatus?: MatchStatus | null;
  status?: MatchStatus | null;
  previousHomeScore?: number | null;
  previousAwayScore?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
};

@Injectable()
export class TournamentNotificationService {
  private readonly logger = new Logger(TournamentNotificationService.name);

  constructor(
    @InjectRepository(Tournaments)
    private readonly tournamentsRepo: Repository<Tournaments>,
    @InjectRepository(GroupMembers)
    private readonly groupMembersRepo: Repository<GroupMembers>,
    @InjectRepository(GroupMemberNotificationSettings)
    private readonly groupMemberNotificationSettingsRepo: Repository<GroupMemberNotificationSettings>,
    @InjectRepository(TournamentUserNotificationSettings)
    private readonly tournamentUserNotificationSettingsRepo: Repository<TournamentUserNotificationSettings>,
    private readonly telegramService: TelegramService,
  ) {}

  async createGroupMemberNotificationSettings(
    groupMemberId: number,
    manager?: EntityManager,
  ) {
    const settings = this.groupMemberNotificationSettingsRepo.create({
      groupMemberId,
    });

    if (manager) {
      return manager.save(GroupMemberNotificationSettings, settings);
    }

    return this.groupMemberNotificationSettingsRepo.save(settings);
  }

  async getGroupMemberNotificationSettings(
    groupId: number,
    userId: number,
  ): Promise<GroupMemberNotificationSettingsData> {
    console.log('try to get group member notification settings (service)');

    const groupMember = await this.groupMembersRepo.findOne({
      where: { group_id: groupId, user_id: userId },
    });

    if (!groupMember) {
      throw new NotFoundException('Group member not found');
    }

    if (groupMember.status !== GroupMemberStatus.Verified) {
      throw new UnauthorizedException('User is not verified in this group');
    }

    let settings = await this.groupMemberNotificationSettingsRepo.findOne({
      where: { groupMemberId: groupMember.id },
    });

    if (!settings) {
      settings = await this.createGroupMemberNotificationSettings(
        groupMember.id,
      );
    }

    return {
      groupMemberId: groupMember.id,
      groupId: groupMember.group_id,
      userId: groupMember.user_id,
      memberStatus: groupMember.status,
      notificationSettings: {
        notifyPredictionChanged: settings.notifyPredictionReminder,
      },
      updatedAt: settings.updatedAt,
    };
  }

  async updateGroupMemberNotificationSetting(
    groupId: number,
    userId: number,
    settingKey: GroupMemberNotificationSettingKey,
    value: boolean,
  ): Promise<GroupMemberNotificationSettingsData> {
    console.log('try to update group member notification setting (service)');

    if (typeof value !== 'boolean') {
      throw new BadRequestException(
        'Notification setting value must be boolean',
      );
    }

    await this.getGroupMemberNotificationSettings(groupId, userId);

    const groupMember = await this.groupMembersRepo.findOne({
      where: { group_id: groupId, user_id: userId },
    });

    if (!groupMember) {
      throw new NotFoundException('Group member not found');
    }

    await this.groupMemberNotificationSettingsRepo.update(
      { groupMemberId: groupMember.id },
      { [settingKey]: value },
    );

    return await this.getGroupMemberNotificationSettings(groupId, userId);
  }

  async getTournamentUserNotificationSettings(
    tournamentId: number,
    userId: number,
  ): Promise<TournamentUserNotificationSettingsData> {
    console.log('try to get tournament user notification settings (service)');

    const tournament = await this.tournamentsRepo.findOne({
      where: [{ id: tournamentId }, { external_id: tournamentId }],
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const tournamentExternalId = tournament.external_id;

    let settings = await this.tournamentUserNotificationSettingsRepo.findOne({
      where: { tournamentId: tournamentExternalId, userId },
    });

    if (!settings) {
      settings = await this.tournamentUserNotificationSettingsRepo.save(
        this.tournamentUserNotificationSettingsRepo.create({
          tournamentId: tournamentExternalId,
          userId,
        }),
      );
    }

    return {
      tournamentId: settings.tournamentId,
      userId: settings.userId,
      notificationSettings: {
        notifyMatchStatusChanged: settings.notifyMatchStatusChanged,
        notifyMatchScoreChanged: settings.notifyMatchScoreChanged,
      },
      updatedAt: settings.updatedAt,
    };
  }

  async updateTournamentUserNotificationSettings(
    tournamentId: number,
    userId: number,
    values: Partial<
      Pick<
        TournamentUserNotificationSettings,
        'notifyMatchStatusChanged' | 'notifyMatchScoreChanged'
      >
    >,
  ): Promise<TournamentUserNotificationSettingsData> {
    console.log(
      'try to update tournament user notification settings (service)',
    );

    const allowedKeys: Array<keyof typeof values> = [
      'notifyMatchStatusChanged',
      'notifyMatchScoreChanged',
    ];

    const hasInvalidValue = allowedKeys.some(
      (key) => values[key] !== undefined && typeof values[key] !== 'boolean',
    );

    if (hasInvalidValue) {
      throw new BadRequestException(
        'Notification setting values must be boolean',
      );
    }

    const updateValues = Object.fromEntries(
      allowedKeys
        .filter((key) => values[key] !== undefined)
        .map((key) => [key, values[key]]),
    );

    if (Object.keys(updateValues).length === 0) {
      throw new BadRequestException(
        'At least one notification setting is required',
      );
    }

    const tournament = await this.tournamentsRepo.findOne({
      where: [{ id: tournamentId }, { external_id: tournamentId }],
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    let settings = await this.tournamentUserNotificationSettingsRepo.findOne({
      where: { tournamentId: tournament.external_id, userId },
    });

    if (!settings) {
      settings = this.tournamentUserNotificationSettingsRepo.create({
        tournamentId: tournament.external_id,
        userId,
      });
    }

    const updatedSettings =
      await this.tournamentUserNotificationSettingsRepo.save(
        Object.assign(settings, updateValues),
      );

    return {
      tournamentId: updatedSettings.tournamentId,
      userId: updatedSettings.userId,
      notificationSettings: {
        notifyMatchStatusChanged: updatedSettings.notifyMatchStatusChanged,
        notifyMatchScoreChanged: updatedSettings.notifyMatchScoreChanged,
      },
      updatedAt: updatedSettings.updatedAt,
    };
  }

  async notifyMatchStatusChanged(change: MatchNotificationChange) {
    await this.notifyTournamentUsers(
      change.tournamentExternalId,
      'notifyMatchStatusChanged',
      this.formatMatchStatusChangedMessage(change),
    );
  }

  async notifyMatchScoreChanged(change: MatchNotificationChange) {
    await this.notifyTournamentUsers(
      change.tournamentExternalId,
      'notifyMatchScoreChanged',
      this.formatMatchScoreChangedMessage(change),
    );
  }

  private async notifyTournamentUsers(
    tournamentExternalId: number,
    settingKey: 'notifyMatchStatusChanged' | 'notifyMatchScoreChanged',
    message: string,
  ) {
    console.log('notify user with changes in a tournament');
    const settings = await this.tournamentUserNotificationSettingsRepo.find({
      where: {
        tournamentId: tournamentExternalId,
        [settingKey]: true,
      },
      relations: {
        user: {
          telegramAccounts: true,
        },
      },
    });

    const chatIds = Array.from(
      new Set(
        settings
          .flatMap((setting) => setting.user?.telegramAccounts ?? [])
          .map((account) => account.chatId)
          .filter((chatId): chatId is number => chatId !== null),
      ),
    );

    const results = await Promise.allSettled(
      chatIds.map((chatId) =>
        this.telegramService.sendMessage(chatId, message, {
          parse_mode: 'HTML',
        }),
      ),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Failed to send tournament notification to chat ${chatIds[index]}: ${String(result.reason)}`,
        );
      }
    });
  }

  private formatMatchStatusChangedMessage(change: MatchNotificationChange) {
    return [
      '<b>Match status changed</b>',
      `<b>Match:</b> ${this.escapeHtml(change.homeTeam)} - ${this.escapeHtml(change.awayTeam)}`,
      `<b>Status:</b> <code>${this.formatNullableValue(change.previousStatus)}</code> -> <code>${this.formatNullableValue(change.status)}</code>`,
    ].join('\n');
  }

  private formatMatchScoreChangedMessage(change: MatchNotificationChange) {
    return [
      '<b>Match score changed</b>',
      `<b>Tournament:</b> ${this.escapeHtml(change.tournamentName)}`,
      `<b>Match:</b> ${this.escapeHtml(change.homeTeam)} - ${this.escapeHtml(change.awayTeam)}`,
      `<b>Score:</b> <code>${this.formatScore(change.previousHomeScore, change.previousAwayScore)}</code> -> <code>${this.formatScore(change.homeScore, change.awayScore)}</code>`,
    ].join('\n');
  }

  private formatScore(homeScore?: number | null, awayScore?: number | null) {
    return `${this.formatNullableValue(homeScore)}:${this.formatNullableValue(awayScore)}`;
  }

  private formatNullableValue(value: string | number | null | undefined) {
    return value ?? 'null';
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
