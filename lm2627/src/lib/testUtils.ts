import type { Fixture, Matchday, Team } from '../types';

/** Minimal team factory for tests. */
export const team = (id: string, pot: 1 | 2 | 3 | 4 = 1, extra: Partial<Team> = {}): Team => ({
  id,
  name: id.toUpperCase(),
  short: id.slice(0, 3).toUpperCase(),
  country: 'XXX',
  pot,
  colors: { primary: '#123456', secondary: '#ffffff' },
  ...extra,
});

export const fixture = (
  id: string,
  homeId: string,
  awayId: string,
  score?: [number, number],
  matchday: Matchday = 1,
  date = '2026-09-08T19:00:00.000Z',
): Fixture => ({
  id,
  matchday,
  date,
  homeId,
  awayId,
  status: score ? 'finished' : 'scheduled',
  score: score ? { home: score[0], away: score[1] } : undefined,
  watchedTogether: false,
});
