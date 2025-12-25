export class FootballTournamentDto {
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
  currentSeason: {
    id: string;
    startDate: string;
    endDate: string;
    currentMatchday: number;
    winner: string | null;
  };
  numberOfAvailableSeasons: number;
  lastUpdated: string;
}
