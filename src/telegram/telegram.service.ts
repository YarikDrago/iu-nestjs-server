import { Injectable, Logger } from '@nestjs/common';
import {
  TelegramApiResponse,
  TelegramSentMessage,
  TelegramUpdate,
  TelegramUser,
} from './telegram.types';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token = process.env.TELEGRAM_BOT_TOKEN;

  async sendMessage(
    chatId: string | number,
    text: string,
    options?: Record<string, unknown>,
  ): Promise<TelegramSentMessage> {
    console.log('try to send message to telegram');

    const data = await this.callApi<TelegramSentMessage>('sendMessage', {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...options,
    });

    return data.result;
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string) {
    const data = await this.callApi<boolean>('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text,
    });

    return data.result;
  }

  async getMe(): Promise<TelegramUser> {
    const data = await this.callApi<TelegramUser>('getMe');
    return data.result;
  }

  async getUpdates(params?: {
    offset?: number;
    timeout?: number;
    limit?: number;
  }): Promise<TelegramUpdate[]> {
    const data = await this.callApi<TelegramUpdate[]>('getUpdates', {
      offset: params?.offset,
      timeout: params?.timeout ?? 0,
      limit: params?.limit ?? 50,
    });

    return data.result;
  }

  private async callApi<T>(
    method: string,
    payload?: Record<string, unknown>,
  ): Promise<TelegramApiResponse<T> & { ok: true }> {
    if (!this.token) throw new Error('TELEGRAM_BOT_TOKEN is not set');

    const url = this.apiUrl(method);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    });

    const data = (await res.json()) as TelegramApiResponse<T>;

    if (!res.ok || !data.ok) {
      this.logger.error(
        `Telegram ${method} failed: ${res.status} ${JSON.stringify(data)}`,
      );
      throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
    }

    return data;
  }

  private apiUrl(method: string) {
    if (!this.token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
    return `https://api.telegram.org/bot${this.token}/${method}`;
  }

  async setMyCommands(
    chatId: string | number,
    commands: Array<{ command: string; description: string }>,
  ): Promise<boolean> {
    const data = await this.callApi<boolean>('setMyCommands', {
      commands,
      scope: {
        type: 'chat',
        chat_id: chatId,
      },
    });

    return data.result;
  }
}
