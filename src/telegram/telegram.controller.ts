// telegram/telegram.controller.ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import type { TelegramUpdate } from './telegram.types';
import { UsersService } from '../users/users.service';
import { TournamentsGroupService } from '../tournaments/services/tournaments_group.service';
import { TournamentsMatchesService } from '../tournaments/services/tournaments_matches.service';
import { Group } from '../tournaments/entities/group.entity';
import {
  GroupMemberNotificationSettingsData,
  TournamentNotificationService,
} from '../tournaments/services/tournament_notification.service';
import { TournamentsPredictionsService } from '../tournaments/services/tournaments_predictions.service';
import { Matches } from '../tournaments/entities/matches.entity';
import { Predictions } from '../tournaments/entities/predictions.entity';
import { GroupMemberStatus } from '../tournaments/entities/group_members.entity';

type PendingPredictionInput = {
  groupId: number;
  matchId: number;
};

@Controller('telegram')
export class TelegramController {
  private lastUpdateId: number | null = null;
  private readonly pendingPredictionInputs = new Map<
    string,
    PendingPredictionInput
  >();

  constructor(
    private readonly telegramService: TelegramService,
    private readonly usersService: UsersService,
    private readonly tournamentsGroupService: TournamentsGroupService,
    private readonly tournamentsMatchesService: TournamentsMatchesService,
    private readonly tournamentsPredictionsService: TournamentsPredictionsService,
    private readonly tournamentNotificationService: TournamentNotificationService,
  ) {}

  @Get('me')
  async me() {
    return this.telegramService.getMe();
  }

  @Post('poll')
  async poll(@Body() body: { limit?: number; timeout?: number } = {}) {
    const offset =
      this.lastUpdateId !== null ? this.lastUpdateId + 1 : undefined;

    const updates = await this.telegramService.getUpdates({
      offset,
      limit: body.limit ?? 50,
      timeout: body.timeout ?? 0,
    });

    if (updates.length > 0) {
      const updateIds = updates
        .map((update) => update.update_id)
        .filter((updateId): updateId is number => typeof updateId === 'number');

      if (updateIds.length > 0) {
        this.lastUpdateId = Math.max(...updateIds);
      }
    }

    const extracted = updates
      .map(
        (update) =>
          update.message ??
          update.edited_message ??
          update.channel_post ??
          update.edited_channel_post,
      )
      .filter((message) => message !== undefined)
      .map((message) => ({
        chatId: message.chat.id,
        chatType: message.chat.type,
        username: message.chat.username,
        title: message.chat.title,
        fromUserId: message.from?.id,
        text: message.text,
        date: message.date,
      }));

    return { updatesCount: updates.length, extracted };
  }

  @Post('webhook')
  async onWebhook(@Body() update: TelegramUpdate) {
    /* Telegram sends 'callback_query' when user interacts with inline keyboards (telegram buttons) */
    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
      return { ok: true };
    }

    /* For messages */
    const message =
      update.message ??
      update.edited_message ??
      update.channel_post ??
      update.edited_channel_post;

    console.log('Received message:', message);

    const text = message?.text;
    const chatId = message?.chat.id;
    const fromUserId = message?.from?.id;

    if (chatId && typeof text === 'string') {
      const command = text.trim().split(/\s+/)[0];

      if (command === '/start') {
        const telegramAccount =
          typeof fromUserId === 'number'
            ? await this.usersService.findUserByTelegramUserId(fromUserId)
            : null;

        if (telegramAccount) {
          await this.telegramService.setMyCommands(chatId, [
            { command: 'predictions', description: 'Prediction groups' },
            { command: 'chat_info', description: 'Show chat info' },
            { command: 'test_msg', description: 'Test message' },
          ]);

          await this.telegramService.sendMessage(chatId, 'Verified user', {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Predictions', callback_data: 'predictions' }],
              ],
            },
          });
        } else {
          await this.telegramService.setMyCommands(chatId, [
            { command: 'start', description: 'Start a chat' },
            { command: 'chat_info', description: 'Show chat info' },
          ]);

          await this.telegramService.sendMessage(
            chatId,
            'Unverified user.\nPlease verify your account:\n' +
              '1) Create and activate account on https://uliantcev.ru/signup;\n' +
              '2) Link your account with Telegram on https://uliantcev.ru/settings;\n' +
              `Copy your Telegram user ID into the field: ${fromUserId ?? 'Unknown'}\n` +
              `Copy your Telegram chat ID into the field: ${chatId}\n` +
              'You can always get these values with /chat_info.',
          );
        }
      }

      if (command === '/chat_info') {
        await this.telegramService.sendMessage(
          chatId,
          this.formatChatInfoMessage(chatId, fromUserId),
          { parse_mode: 'HTML' },
        );
      }

      if (command === '/predictions') {
        await this.sendUserPredictionsGroups(chatId, fromUserId);
      }

      if (command === '/test_msg') {
        const now = new Date().toISOString();
        await this.telegramService.sendMessage(
          chatId,
          `Test message response: ${now}`,
        );
      }

      if (!text.trim().startsWith('/')) {
        await this.handlePendingPredictionInput(chatId, fromUserId, text);
      }
    }

    return { ok: true };
  }

  private async handleCallbackQuery(
    callbackQuery: NonNullable<TelegramUpdate['callback_query']>,
  ) {
    const callbackData = callbackQuery.data;

    if (callbackData === 'predictions') {
      await this.telegramService.answerCallbackQuery(callbackQuery.id);
      const chatId = callbackQuery.message?.chat.id;
      if (!chatId) return;

      await this.sendUserPredictionsGroups(chatId, callbackQuery.from.id);
      return;
    }

    await this.telegramService.answerCallbackQuery(callbackQuery.id);

    const predictionsGroupId =
      this.parsePredictionsGroupMatchesCallback(callbackData);

    if (predictionsGroupId) {
      const chatId = callbackQuery.message?.chat.id;
      if (!chatId) return;

      await this.sendUserPredictionsGroupMatches(
        chatId,
        callbackQuery.from.id,
        predictionsGroupId,
      );
      return;
    }

    const predictionMatchCallback =
      this.parsePredictionMatchCallback(callbackData);

    if (predictionMatchCallback) {
      const chatId = callbackQuery.message?.chat.id;
      if (!chatId) return;

      await this.requestPredictionScoreInput(
        chatId,
        callbackQuery.from.id,
        predictionMatchCallback.groupId,
        predictionMatchCallback.matchId,
      );
      return;
    }

    const settingsGroupId =
      this.parsePredictionsGroupSettingsCallback(callbackData);

    if (settingsGroupId) {
      const chatId = callbackQuery.message?.chat.id;
      if (!chatId) return;

      await this.sendUserPredictionsGroupSettings(
        chatId,
        callbackQuery.from.id,
        settingsGroupId,
      );
    }
  }

  private async sendUserPredictionsGroups(
    chatId: string | number,
    telegramUserId?: number,
  ) {
    if (typeof telegramUserId !== 'number') {
      await this.telegramService.sendMessage(
        chatId,
        'Could not detect Telegram user.',
      );
      return;
    }

    const telegramAccount =
      await this.usersService.findUserByTelegramUserId(telegramUserId);

    if (!telegramAccount) {
      await this.telegramService.sendMessage(
        chatId,
        'Unverified user. Please link your account first.',
      );
      return;
    }

    const groups = await this.tournamentsGroupService.getUserGroups(
      telegramAccount.user.id,
    );

    if (groups.length === 0) {
      await this.telegramService.sendMessage(
        chatId,
        'You do not have verified tournament groups yet.',
      );
      return;
    }

    await this.telegramService.sendMessage(chatId, 'Your prediction groups:');

    /* Send the information of the group separately with buttons beneath */
    for (const [index, group] of groups.entries()) {
      const predictionsGroupMessage = this.formatPredictionsGroupMessage(
        group,
        index,
        telegramAccount.user.id,
      );

      await this.telegramService.sendMessage(
        chatId,
        predictionsGroupMessage.text,
        predictionsGroupMessage.options,
      );
    }
  }

  private formatPredictionsGroupMessage(
    group: Group,
    index: number,
    userId: number,
  ) {
    const lines = [
      `${index + 1}. ${group.name}`,
      `Tournament: ${group.tournament?.name ?? 'Unknown'}`,
      `Season: ${this.formatDate(group.season?.start_date)} / ${this.formatDate(group.season?.end_date)}`,
      `Group ID: ${group.id}`,
      `Role: ${Number(group.owner_id) === Number(userId) ? 'Owner' : 'Member'}`,
    ];

    return {
      text: lines.join('\n'),
      options: {
        reply_markup: {
          /* Buttons */
          inline_keyboard: [
            [
              {
                text: 'Make predictions',
                callback_data: `predictions_group:${group.id}:table`,
              },
              {
                text: 'settings',
                callback_data: `predictions/group/${group.id}/settings`,
              },
            ],
          ],
        },
      },
    };
  }

  private async sendUserPredictionsGroupMatches(
    chatId: string | number,
    telegramUserId: number,
    groupId: number,
  ) {
    const telegramAccount =
      await this.usersService.findUserByTelegramUserId(telegramUserId);

    if (!telegramAccount) {
      await this.telegramService.sendMessage(
        chatId,
        'Unverified user. Please link your account first.',
      );
      return;
    }

    const group = await this.tournamentsGroupService.findGroupById(
      groupId,
      true,
    );

    if (!group) {
      await this.telegramService.sendMessage(
        chatId,
        'Prediction group not found.',
      );
      return;
    }

    const membership = await this.tournamentsGroupService.findUserInGroup(
      groupId,
      telegramAccount.user.id,
    );

    if (!membership || membership.status !== GroupMemberStatus.Verified) {
      await this.telegramService.sendMessage(
        chatId,
        'You are not a verified member of this prediction group.',
      );
      return;
    }

    const matches = await this.tournamentsMatchesService.getCompetitionMatches(
      group.tournament_id,
      group.season_id,
    );

    const nextMatches = this.getNextPredictionMatches(matches, 5);

    if (nextMatches.length === 0) {
      await this.telegramService.sendMessage(
        chatId,
        'No upcoming matches available for predictions in this group.',
      );
      return;
    }

    const predictions =
      await this.tournamentsPredictionsService.getGroupPredictions(groupId);
    const userPredictionByMatchId = this.getUserPredictionByMatchId(
      predictions,
      telegramAccount.user.id,
    );

    await this.telegramService.sendMessage(
      chatId,
      this.formatPredictionMatchesMessage(
        group,
        nextMatches,
        userPredictionByMatchId,
      ),
      this.getPredictionMatchesMessageOptions(group.id, nextMatches),
    );
  }

  private getNextPredictionMatches(matches: Matches[], limit: number) {
    const now = Date.now();

    return matches
      .filter((match) => {
        if (!match.start_time) return false;
        return new Date(match.start_time).getTime() > now;
      })
      .sort((left, right) => {
        const leftTime = left.start_time
          ? new Date(left.start_time).getTime()
          : Number.MAX_SAFE_INTEGER;
        const rightTime = right.start_time
          ? new Date(right.start_time).getTime()
          : Number.MAX_SAFE_INTEGER;

        return leftTime - rightTime || Number(left.id) - Number(right.id);
      })
      .slice(0, limit);
  }

  private getUserPredictionByMatchId(
    predictions: Predictions[],
    userId: number,
  ) {
    return new Map(
      predictions
        .filter((prediction) => Number(prediction.user_id) === Number(userId))
        .map((prediction) => [Number(prediction.match_id), prediction]),
    );
  }

  private formatPredictionMatchesMessage(
    group: Group,
    matches: Matches[],
    userPredictionByMatchId: Map<number, Predictions>,
  ) {
    const lines = [
      `<b>${this.escapeHtml(group.name)}</b>`,
      'Next matches for predictions:',
      '',
      ...matches.map((match, index) => {
        const prediction = userPredictionByMatchId.get(Number(match.id));

        return [
          `${index + 1}. <b>${this.escapeHtml(match.home_team ?? 'TBD')}</b> vs <b>${this.escapeHtml(match.away_team ?? 'TBD')}</b>`,
          `Date: <code>${this.formatDateTime(match.start_time)}</code>`,
          `Prediction score: <code>${prediction?.home_score ?? 'null'} - ${prediction?.away_score ?? 'null'}</code>`,
        ].join('\n');
      }),
      '',
      'Choose a match and then send score as <code>2:1</code>.',
    ];

    return lines.join('\n');
  }

  private getPredictionMatchesMessageOptions(
    groupId: number,
    matches: Matches[],
  ) {
    return {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: matches.map((match, index) => [
          {
            text: `${index + 1}. ${this.formatMatchButtonText(match)}`,
            callback_data: `predictions/group/${groupId}/match/${match.id}`,
          },
        ]),
      },
    };
  }

  private formatMatchButtonText(match: Matches) {
    return `${match.home_team ?? 'TBD'} - ${match.away_team ?? 'TBD'}`.slice(
      0,
      54,
    );
  }

  private async requestPredictionScoreInput(
    chatId: string | number,
    telegramUserId: number,
    groupId: number,
    matchId: number,
  ) {
    this.pendingPredictionInputs.set(
      this.getPendingPredictionInputKey(chatId, telegramUserId),
      {
        groupId,
        matchId,
      },
    );

    await this.telegramService.sendMessage(
      chatId,
      'Send your prediction score in format <code>2:1</code>.',
      { parse_mode: 'HTML' },
    );
  }

  private async handlePendingPredictionInput(
    chatId: string | number,
    telegramUserId: number | undefined,
    text: string,
  ) {
    if (typeof telegramUserId !== 'number') return false;

    const pendingInput = this.pendingPredictionInputs.get(
      this.getPendingPredictionInputKey(chatId, telegramUserId),
    );

    if (!pendingInput) return false;

    const score = this.parsePredictionScore(text);

    if (!score) {
      await this.telegramService.sendMessage(
        chatId,
        'Invalid score format. Send score as <code>2:1</code>.',
        { parse_mode: 'HTML' },
      );
      return true;
    }

    const telegramAccount =
      await this.usersService.findUserByTelegramUserId(telegramUserId);

    if (!telegramAccount) {
      await this.telegramService.sendMessage(
        chatId,
        'Unverified user. Please link your account first.',
      );
      return true;
    }

    try {
      await this.tournamentsPredictionsService.upsertPrediction(
        telegramAccount.user.id,
        pendingInput.groupId,
        pendingInput.matchId,
        score.homeScore,
        score.awayScore,
      );

      this.pendingPredictionInputs.delete(
        this.getPendingPredictionInputKey(chatId, telegramUserId),
      );

      await this.telegramService.sendMessage(
        chatId,
        `Prediction saved: ${score.homeScore}:${score.awayScore}`,
      );
    } catch (error) {
      await this.telegramService.sendMessage(
        chatId,
        `Could not save prediction: ${(error as Error).message}`,
      );
    }

    return true;
  }

  private parsePredictionScore(text: string) {
    const match = text.trim().match(/^(\d{1,2})\s*[:-]\s*(\d{1,2})$/);
    if (!match) return null;

    return {
      homeScore: Number(match[1]),
      awayScore: Number(match[2]),
    };
  }

  private getPendingPredictionInputKey(
    chatId: string | number,
    telegramUserId: number,
  ) {
    return `${chatId}:${telegramUserId}`;
  }

  private async sendUserPredictionsGroupSettings(
    chatId: string | number,
    telegramUserId: number,
    groupId: number,
  ) {
    const telegramAccount =
      await this.usersService.findUserByTelegramUserId(telegramUserId);

    if (!telegramAccount) {
      await this.telegramService.sendMessage(
        chatId,
        'Unverified user. Please link your account first.',
      );
      return;
    }

    const settings =
      await this.tournamentNotificationService.getGroupMemberNotificationSettings(
        groupId,
        telegramAccount.user.id,
      );

    await this.telegramService.sendMessage(
      chatId,
      this.formatPredictionGroupNotificationSettingsMessage(settings),
      this.getPredictionGroupNotificationSettingsMessageOptions(),
    );
  }

  private parsePredictionsGroupSettingsCallback(callbackData?: string) {
    if (!callbackData) return null;

    const match = callbackData.match(/^predictions\/group\/(\d+)\/settings$/);
    if (match) return Number(match[1]);

    const legacyMatch = callbackData.match(
      /^predictions_group:(\d+):settings$/,
    );
    if (legacyMatch) return Number(legacyMatch[1]);

    return null;
  }

  private parsePredictionsGroupMatchesCallback(callbackData?: string) {
    if (!callbackData) return null;

    const match = callbackData.match(/^predictions_group:(\d+):table$/);
    if (match) return Number(match[1]);

    return null;
  }

  private parsePredictionMatchCallback(callbackData?: string) {
    if (!callbackData) return null;

    const match = callbackData.match(
      /^predictions\/group\/(\d+)\/match\/(\d+)$/,
    );

    if (!match) return null;

    return {
      groupId: Number(match[1]),
      matchId: Number(match[2]),
    };
  }

  private formatPredictionGroupNotificationSettingsMessage(
    settings: GroupMemberNotificationSettingsData,
  ) {
    const notificationSettings = settings.notificationSettings;

    return [
      `<b>Group ID:</b> <code>${settings.groupId}</code>`,
      '<b>Notification settings:</b>',
      `<b>Prediction changed:</b> <code>${this.formatNotificationSettingStatus(notificationSettings.notifyPredictionChanged)}</code>`,
    ].join('\n');
  }

  private getPredictionGroupNotificationSettingsMessageOptions() {
    return {
      parse_mode: 'HTML',
    };
  }

  private formatNotificationSettingStatus(value: boolean) {
    return value ? 'enabled' : 'disabled';
  }

  private formatChatInfoMessage(
    chatId: string | number,
    telegramUserId?: number,
  ) {
    return [
      '<b>Telegram chat info</b>',
      `<b>Telegram user ID:</b> <code>${telegramUserId ?? 'Unknown'}</code>`,
      `<b>Telegram chat ID:</b> <code>${chatId}</code>`,
    ].join('\n');
  }

  private formatDate(date?: Date | string) {
    if (!date) return 'Unknown';

    return new Date(date).toISOString().slice(0, 10);
  }

  private formatDateTime(date?: Date | string | null) {
    if (!date) return 'Unknown';

    return new Date(date).toISOString().slice(0, 16).replace('T', ' ');
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
