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
