// telegram/telegram.controller.ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import type { TelegramUpdate } from './telegram.types';
import { UsersService } from '../users/users.service';
import { TournamentsService } from '../tournaments/services/tournaments.service';
import { Group } from '../tournaments/entities/group.entity';
import {
  GroupMemberNotificationSettingsData,
  TournamentNotificationService,
} from '../tournaments/services/tournament_notification.service';

@Controller('telegram')
export class TelegramController {
  private lastUpdateId: number | null = null;

  constructor(
    private readonly telegramService: TelegramService,
    private readonly usersService: UsersService,
    private readonly tournamentsService: TournamentsService,
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
          ]);

          await this.telegramService.sendMessage(
            chatId,
            'Unverified user.\nPlease verify your account:\n' +
              '1) Create and activate account on https://uliantcev.ru/signup;\n' +
              '2) Link your account with Telegram on https:"//uliantcev.ru/settings;\n' +
              `Copy your telegram ID into the field: ${fromUserId}`,
          );
        }
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

    const updateSettingsCallback =
      this.parsePredictionsGroupUpdateNotificationSettingCallback(callbackData);

    if (updateSettingsCallback) {
      const chatId = callbackQuery.message?.chat.id;
      if (!chatId) return;

      await this.updateUserPredictionsGroupNotifyMatchStatusChanged(
        chatId,
        callbackQuery.from.id,
        updateSettingsCallback.groupId,
        updateSettingsCallback.value,
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

    const groups = await this.tournamentsService.getUserGroups(
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
                text: 'See table',
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
      this.getPredictionGroupNotificationSettingsMessageOptions(settings),
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

  private parsePredictionsGroupUpdateNotificationSettingCallback(
    callbackData?: string,
  ) {
    if (!callbackData) return null;

    const match = callbackData.match(
      /^predictions\/group\/(\d+)\/settings\/notify-match-status-changed\/(true|false)$/,
    );

    if (!match) return null;

    return {
      groupId: Number(match[1]),
      value: match[2] === 'true',
    };
  }

  private async updateUserPredictionsGroupNotifyMatchStatusChanged(
    chatId: string | number,
    telegramUserId: number,
    groupId: number,
    value: boolean,
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
      await this.tournamentNotificationService.updateGroupMemberNotificationSetting(
        groupId,
        telegramAccount.user.id,
        'notifyMatchStatusChanged',
        value,
      );

    await this.telegramService.sendMessage(
      chatId,
      this.formatPredictionGroupNotificationSettingsMessage(settings),
      this.getPredictionGroupNotificationSettingsMessageOptions(settings),
    );
  }

  private formatPredictionGroupNotificationSettingsMessage(
    settings: GroupMemberNotificationSettingsData,
  ) {
    const notificationSettings = settings.notificationSettings;

    return [
      `<b>Group ID:</b> <code>${settings.groupId}</code>`,
      '<b>Notification settings:</b>',
      `<b>Match status changed:</b> <code>${this.formatNotificationSettingStatus(notificationSettings.notifyMatchStatusChanged)}</code>`,
      `<b>Match score changed:</b> <code>${this.formatNotificationSettingStatus(notificationSettings.notifyMatchScoreChanged)}</code>`,
      `<b>Prediction changed:</b> <code>${this.formatNotificationSettingStatus(notificationSettings.notifyPredictionChanged)}</code>`,
    ].join('\n');
  }

  private getPredictionGroupNotificationSettingsMessageOptions(
    settings: GroupMemberNotificationSettingsData,
  ) {
    const nextNotifyMatchStatusChangedValue =
      !settings.notificationSettings.notifyMatchStatusChanged;

    return {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `${nextNotifyMatchStatusChangedValue ? 'Enable' : 'Disable'} match status notifications`,
              callback_data: `predictions/group/${settings.groupId}/settings/notify-match-status-changed/${nextNotifyMatchStatusChangedValue}`,
            },
          ],
        ],
      },
    };
  }

  private formatNotificationSettingStatus(value: boolean) {
    return value ? 'enabled' : 'disabled';
  }

  private formatDate(date?: Date | string) {
    if (!date) return 'Unknown';

    return new Date(date).toISOString().slice(0, 10);
  }
}
