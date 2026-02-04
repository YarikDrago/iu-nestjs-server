import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { FootballCompetitionsDto } from './dto/football-competitions.dto';
import { validate } from 'class-validator';
import { FootballCompetitionMatchesDto } from './dto/football-competition-matches.dto';

@Injectable()
export class FootballService {
  private readonly logger = new Logger(FootballService.name);
  constructor() {}

  async getCompetitions() {
    try {
      if (!process.env.FOOTBALL_API_TOKEN) throw new Error('No API token');
      if (!process.env.FOOTBALL_API_URL) throw new Error('No API URL');
      const response = await fetch(
        `${process.env.FOOTBALL_API_URL}/competitions`,
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

      console.log('Success!');
      const raw: unknown = await response.json();
      const dto = plainToInstance(FootballCompetitionsDto, raw);

      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
        forbidUnknownValues: true, // TODO
      });

      if (errors.length > 0) {
        this.logger.warn(`Football API payload validation failed`);
        this.logger.warn(JSON.stringify(errors, null, 2));
        throw new ServiceUnavailableException(
          'Football API returned invalid data',
        );
      }

      return dto;
    } catch (e) {
      console.log('Error:', e);
      this.logger.error(e);
      throw e;
    }
  }

  // TODO rename to getCompetitionMatches
  async getCompetitionData(competitionId: string) {
    if (!process.env.FOOTBALL_API_TOKEN) throw new Error('No API token');
    if (!process.env.FOOTBALL_API_URL) throw new Error('No API URL');
    const response = await fetch(
      `${process.env.FOOTBALL_API_URL}/competitions/${competitionId}/matches`,
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

    const raw: unknown = await response.json();
    const dto = plainToInstance(FootballCompetitionMatchesDto, raw);

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: false,
      forbidUnknownValues: true, // TODO
    });

    if (errors.length > 0) {
      throw new ServiceUnavailableException(
        'Football API returned invalid data',
      );
    }

    return dto;
  }
}
