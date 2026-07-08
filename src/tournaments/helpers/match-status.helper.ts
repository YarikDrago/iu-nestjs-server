import { BadRequestException } from '@nestjs/common';
import { MatchStatus } from '../entities/matches.entity';

export function parseMatchStatus(
  status: string | null | undefined,
): MatchStatus | null {
  if (!status) {
    return null;
  }

  if (Object.values(MatchStatus).includes(status as MatchStatus)) {
    return status as MatchStatus;
  }

  throw new BadRequestException(`Unknown match status: ${status}`);
}

export function resolveAutomaticMatchStatus(
  apiStatus: MatchStatus | null,
  dbStatus: MatchStatus | null,
): MatchStatus | null {
  if (dbStatus === MatchStatus.FINISHED) {
    return dbStatus;
  }

  if (
    dbStatus === MatchStatus.IN_PLAY &&
    (apiStatus === MatchStatus.SCHEDULED || apiStatus === MatchStatus.TIMED)
  ) {
    return dbStatus;
  }

  return apiStatus;
}
