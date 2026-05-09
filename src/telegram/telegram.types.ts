export type TelegramApiResponse<T> =
  | {
      ok: true;
      result: T;
      description?: string;
    }
  | {
      ok: false;
      result?: never;
      description?: string;
      error_code?: number;
    };

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number | string;
  type: string;
  username?: string;
  title?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  date: number;
  text?: string;
  from?: TelegramUser;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramSentMessage extends TelegramMessage {
  //
}
