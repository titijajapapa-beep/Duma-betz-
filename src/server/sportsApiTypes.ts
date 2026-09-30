export interface RawFixtureCandidate {
  id: string;
  externalId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: 'scheduled' | 'live' | 'finished';
  homeScore?: number;
  awayScore?: number;
  odds: {
    home: number;
    draw: number;
    away: number;
    over25?: number;
    under25?: number;
    bttsYes?: number;
    bttsNo?: number;
  };
}
