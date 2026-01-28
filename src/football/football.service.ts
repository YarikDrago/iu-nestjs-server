import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

@Injectable()
export class FootballService {
  private readonly logger = new Logger(FootballService.name);
  constructor() {}
  async getCompetitionData(tournamentId: string) {
    if (!process.env.FOOTBALL_API_TOKEN) throw new Error('No API token');
    if (!process.env.FOOTBALL_API_URL) throw new Error('No API URL');
    const response = await fetch(
      `${process.env.FOOTBALL_API_URL}/competitions/${tournamentId}`,
      {
        method: 'GET',
        headers: {
          'X-Auth-Token': process.env.FOOTBALL_API_TOKEN,
        },
      },
    );

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      this.logger.warn(
        `Football API error: ${response.status} ${response.statusText}. Body: ${bodyText}`,
      );
      throw new ServiceUnavailableException(
        `Football API responded with ${response.status}`,
      );
    }

    return response;
  }
}
