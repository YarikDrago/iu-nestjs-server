import { Injectable } from '@nestjs/common';

@Injectable()
export class FootballService {
  async getApiData() {
    if (!process.env.FOOTBALL_API_TOKEN) throw new Error('No API token');
    if (!process.env.FOOTBALL_API_URL) throw new Error('No API URL');
    const response = await fetch(
      `${process.env.FOOTBALL_API_URL}/competitions/2018/matches`,
      {
        method: 'GET',
        headers: {
          'X-Auth-Token': process.env.FOOTBALL_API_TOKEN,
        },
      },
    );
    console.log(await response.json());
    console.log('END');
  }
}
