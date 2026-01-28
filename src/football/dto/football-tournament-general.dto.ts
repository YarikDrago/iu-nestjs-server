type FootballSeason = {
  id: string;
  startDate: string;
  endDate: string;
  currentMatchday: number;
  winner: string | null;
};

export class FootballTournamentGeneralDto {
  id: number;
  area: {
    id: number;
    name: string;
    code: string;
    flag: string | null;
  };
  name: string;
  code: string;
  type: string;
  emblem: string; // link
  plan: string;
  currentSeason: FootballSeason;
  numberOfAvailableSeasons: number;
  lastUpdated: string;
  seasons: FootballSeason[];
}
