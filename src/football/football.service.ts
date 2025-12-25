import { Injectable } from '@nestjs/common';

@Injectable()
export class FootballService {
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
    return response;
  }
}
