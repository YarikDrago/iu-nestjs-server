import { BadRequestException } from '@nestjs/common';
import { ManualUpdateMatchDto } from '../dto/manual-update-match.dto';
import { MatchStatus } from '../entities/matches.entity';
import { parseMatchStatus } from './match-status.helper';

export type ManualMatchUpdate = {
  home_team?: string | null;
  away_team?: string | null;
  start_time?: Date | null;
  status?: MatchStatus | null;
  home_score?: number | null;
  away_score?: number | null;
  hide_predictions?: boolean;
  manualUpdate?: boolean;
};

export function normalizeManualMatchUpdate(
  dto: ManualUpdateMatchDto,
): ManualMatchUpdate {
  if (!dto || typeof dto !== 'object') {
    throw new BadRequestException({
      message: 'Request body is required',
      code: 'BAD_REQUEST',
    });
  }

  const update: ManualMatchUpdate = {};

  const homeTeam = pickManualUpdateValue(dto, 'homeTeam', 'home_team');
  if (homeTeam.exists) {
    update.home_team = normalizeNullableTeamName(homeTeam.value, 'homeTeam');
  }

  const awayTeam = pickManualUpdateValue(dto, 'awayTeam', 'away_team');
  if (awayTeam.exists) {
    update.away_team = normalizeNullableTeamName(awayTeam.value, 'awayTeam');
  }

  const startTime = pickManualUpdateValue(dto, 'startTime', 'start_time');
  if (startTime.exists) {
    update.start_time = normalizeNullableDate(startTime.value, 'startTime');
  }

  const status = pickManualUpdateValue(dto, 'status');
  if (status.exists) {
    update.status = parseMatchStatus(status.value as string | null);
  }

  const homeScore = pickManualUpdateValue(dto, 'homeScore', 'home_score');
  if (homeScore.exists) {
    update.home_score = normalizeNullableScore(homeScore.value, 'homeScore');
  }

  const awayScore = pickManualUpdateValue(dto, 'awayScore', 'away_score');
  if (awayScore.exists) {
    update.away_score = normalizeNullableScore(awayScore.value, 'awayScore');
  }

  const hidePredictions = pickManualUpdateValue(
    dto,
    'hidePredictions',
    'hide_predictions',
  );
  if (hidePredictions.exists) {
    update.hide_predictions = normalizeBoolean(
      hidePredictions.value,
      'hidePredictions',
    );
  }

  const manualUpdated = pickManualUpdateValue(
    dto,
    'manualUpdated',
    'manualUpdate',
    'manual_updated',
    'manual_update',
  );
  if (manualUpdated.exists) {
    update.manualUpdate = normalizeBoolean(
      manualUpdated.value,
      'manualUpdated',
    );
  }

  return update;
}

export function hasManualMatchUpdateKey(
  update: ManualMatchUpdate,
  key: keyof ManualMatchUpdate,
): boolean {
  return Boolean(Object.prototype.hasOwnProperty.call(update, key));
}

function pickManualUpdateValue(
  dto: ManualUpdateMatchDto,
  primaryKey: keyof ManualUpdateMatchDto,
  ...fallbackKeys: (keyof ManualUpdateMatchDto)[]
): { exists: boolean; value: unknown } {
  if (Object.prototype.hasOwnProperty.call(dto, primaryKey)) {
    const value = dto[primaryKey];
    if (value !== undefined) {
      return { exists: true, value };
    }
  }

  for (const fallbackKey of fallbackKeys) {
    if (Object.prototype.hasOwnProperty.call(dto, fallbackKey)) {
      const value = dto[fallbackKey];
      if (value !== undefined) {
        return { exists: true, value };
      }
    }
  }

  return { exists: false, value: undefined };
}

function normalizeNullableString(value: unknown, fieldName: string) {
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

function normalizeNullableTeamName(value: unknown, fieldName: string) {
  if (
    value &&
    typeof value === 'object' &&
    Object.prototype.hasOwnProperty.call(value, 'name')
  ) {
    return normalizeNullableString(
      (value as { name?: unknown }).name,
      `${fieldName}.name`,
    );
  }

  return normalizeNullableString(value, fieldName);
}

function normalizeNullableDate(value: unknown, fieldName: string) {
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

function normalizeNullableScore(value: unknown, fieldName: string) {
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

function normalizeBoolean(value: unknown, fieldName: string) {
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`${fieldName} must be a boolean`);
  }

  return value;
}
