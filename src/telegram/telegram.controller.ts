// telegram/telegram.controller.ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import type { TelegramUpdate } from './telegram.types';
import { UsersService } from '../users/users.service';
import { TournamentsService } from '../tournaments/services/tournaments.service';
import { Group } from '../tournaments/entities/group.entity';

@Controller('telegram')
export class TelegramController {
  private lastUpdateId: number | null = null;

  constructor(
    private readonly telegramService: TelegramService,
    private readonly usersService: UsersService,
    private readonly tournamentsService: TournamentsService,
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
    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
      return { ok: true };
    }

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
    if (callbackQuery.data !== 'predictions') {
      await this.telegramService.answerCallbackQuery(callbackQuery.id);
      return;
    }

    await this.telegramService.answerCallbackQuery(callbackQuery.id);

    const chatId = callbackQuery.message?.chat.id;
    if (!chatId) return;

    await this.sendUserPredictionsGroups(chatId, callbackQuery.from.id);
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

    await this.telegramService.sendMessage(
      chatId,
      this.formatPredictionsGroupsMessage(groups, telegramAccount.user.id),
    );
  }

  private formatPredictionsGroupsMessage(groups: Group[], userId: number) {
    if (groups.length === 0) {
      return 'You do not have verified tournament groups yet.';
    }

    const lines = groups.flatMap((group, index) => [
      `${index + 1}. ${group.name}`,
      `Tournament: ${group.tournament?.name ?? 'Unknown'}`,
      `Season: ${this.formatDate(group.season?.start_date)} / ${this.formatDate(group.season?.end_date)}`,
      `Role: ${Number(group.owner_id) === Number(userId) ? 'Owner' : 'Member'}`,
      '',
    ]);

    return ['Your prediction groups:', '', ...lines].join('\n').trim();
  }

  private formatDate(date?: Date | string) {
    if (!date) return 'Unknown';

    return new Date(date).toISOString().slice(0, 10);
  }
}
