// Official dates from the competition format. Dates are the published windows;
// exact kick-off times per match come from the imported schedule.

import type { Matchday, KnockoutRound } from '../types';

export type MatchdayWindow = {
  matchday: Matchday;
  label: string;
  /** Inclusive window in which every match of this matchday is played. */
  from: string; // ISO date (UTC midnight)
  to: string;
};

export const MATCHDAYS: MatchdayWindow[] = [
  { matchday: 1, label: '8. – 10. september 2026', from: '2026-09-08', to: '2026-09-10' },
  { matchday: 2, label: '13. / 14. október 2026', from: '2026-10-13', to: '2026-10-14' },
  { matchday: 3, label: '20. / 21. október 2026', from: '2026-10-20', to: '2026-10-21' },
  { matchday: 4, label: '3. / 4. november 2026', from: '2026-11-03', to: '2026-11-04' },
  { matchday: 5, label: '24. / 25. november 2026', from: '2026-11-24', to: '2026-11-25' },
  { matchday: 6, label: '8. / 9. december 2026', from: '2026-12-08', to: '2026-12-09' },
  { matchday: 7, label: '19. / 20. január 2027', from: '2027-01-19', to: '2027-01-20' },
  { matchday: 8, label: '27. január 2027', from: '2027-01-27', to: '2027-01-27' },
];

export const MATCHDAY_8_NOTE = 'Všetkých 18 zápasov naraz.';

export type RoundWindow = {
  round: KnockoutRound;
  label: string;
  legs: [{ from: string; to: string }, { from: string; to: string }?];
  venue?: string;
};

export const KNOCKOUT_ROUNDS: RoundWindow[] = [
  {
    round: 'PO',
    label: 'Play-off',
    legs: [
      { from: '2027-02-16', to: '2027-02-17' },
      { from: '2027-02-23', to: '2027-02-24' },
    ],
  },
  {
    round: 'R16',
    label: 'Osemfinále',
    legs: [
      { from: '2027-03-09', to: '2027-03-10' },
      { from: '2027-03-16', to: '2027-03-17' },
    ],
  },
  {
    round: 'QF',
    label: 'Štvrťfinále',
    legs: [
      { from: '2027-04-06', to: '2027-04-07' },
      { from: '2027-04-13', to: '2027-04-14' },
    ],
  },
  {
    round: 'SF',
    label: 'Semifinále',
    legs: [
      { from: '2027-04-27', to: '2027-04-28' },
      { from: '2027-05-04', to: '2027-05-05' },
    ],
  },
  {
    round: 'F',
    label: 'Finále',
    legs: [{ from: '2027-06-05', to: '2027-06-05' }],
    venue: 'Estadio Metropolitano, Madrid',
  },
];

/** Draw dates worth showing in the UI. */
export const DRAWS = {
  leaguePhase: '2026-08-27', // Monako
  playoff: '2027-01-31', // koniec januára 2027
  knockoutBracket: '2027-02-26',
} as const;

/** Final day — the season prediction envelope unseals on this date. */
export const FINAL_DATE = '2027-06-05';

export const ROUND_LABELS: Record<KnockoutRound, string> = {
  PO: 'Play-off',
  R16: 'Osemfinále',
  QF: 'Štvrťfinále',
  SF: 'Semifinále',
  F: 'Finále',
};
