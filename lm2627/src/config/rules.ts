// ---------------------------------------------------------------------------
// ALL COMPETITION AND SCORING RULES LIVE HERE.
// This is the single place to edit when a rule turns out to be different.
// ---------------------------------------------------------------------------

import type { StandingRow } from '../types';

export const POINTS = { win: 3, draw: 1, loss: 0 } as const;

export const LEAGUE_PHASE = {
  teams: 36,
  matchesPerTeam: 8,
  homeMatchesPerTeam: 4,
  awayMatchesPerTeam: 4,
  opponentsPerPot: 2,
  totalMatches: 144,
  matchesPerMatchday: 18,
  matchdays: 8,
} as const;

/** Qualification bands after the league phase. */
export const BANDS = {
  /** 1–8: straight to the round of 16. */
  directR16: { from: 1, to: 8 },
  /** 9–24: two-legged play-off. */
  playoff: { from: 9, to: 24 },
  /** 25–36: out of Europe, no Europa League drop. */
  eliminated: { from: 25, to: 36 },
} as const;

// ---------------------------------------------------------------------------
// TIEBREAKERS
//
// !!! The exact order below is NOT verified against the current UEFA
// regulations — check it in the official rulebook for 2026/27 and reorder this
// array if it differs. Nothing else in the app needs to change: the standings
// calculation walks this list in order.
// ---------------------------------------------------------------------------

export type TiebreakerId =
  | 'points'
  | 'goalDifference'
  | 'goalsScored'
  | 'awayGoalsScored'
  | 'wins'
  | 'awayWins'
  | 'disciplinaryPoints'
  | 'clubCoefficient';

export type Tiebreaker = {
  id: TiebreakerId;
  label: string;
  /** Higher value ranks first unless `lowerIsBetter`. */
  value: (row: StandingRow) => number;
  lowerIsBetter?: boolean;
};

export const tiebreakers: Tiebreaker[] = [
  { id: 'points', label: 'Body', value: (r) => r.points },
  { id: 'goalDifference', label: 'Gólový rozdiel', value: (r) => r.goalDiff },
  { id: 'goalsScored', label: 'Strelené góly', value: (r) => r.goalsFor },
  { id: 'awayGoalsScored', label: 'Strelené góly vonku', value: (r) => r.awayGoalsFor },
  { id: 'wins', label: 'Počet výhier', value: (r) => r.won },
  { id: 'awayWins', label: 'Výhry vonku', value: (r) => r.awayWins },
  {
    id: 'disciplinaryPoints',
    label: 'Disciplinárne body',
    value: (r) => r.disciplinaryPoints,
    lowerIsBetter: true,
  },
  { id: 'clubCoefficient', label: 'Klubový koeficient', value: (r) => r.coefficient },
];

// ---------------------------------------------------------------------------
// KNOCKOUT PHASE
// ---------------------------------------------------------------------------

export const KNOCKOUT = {
  /** No away-goals rule: level on aggregate means extra time, then penalties. */
  awayGoalsRule: false,
  extraTime: true,
  penalties: true,
  /** Teams finishing 1–8 host the second leg of every tie they play. */
  higherSeedHostsSecondLeg: true,
} as const;

// ---------------------------------------------------------------------------
// FAMILY PREDICTION LEAGUE
// ---------------------------------------------------------------------------

export const SCORING = {
  /** Exact score. */
  exact: 3,
  /** Right winner (or a drawn match predicted as a draw) but wrong score. */
  outcome: 1,
  /** Anything else. */
  miss: 0,
  /**
   * Bonus for nailing the exact score in a match where the favourite lost.
   * "Favourite" = the team with the higher pre-match strength rating from
   * config/simulation.ts (see NOTES.md — this is our own definition).
   */
  upsetBonus: 1,
} as const;

/**
 * Predictions for a matchday lock at the kick-off of the first match of that
 * matchday. After that they cannot be changed.
 */
export const PREDICTION_LOCK = {
  lockAtFirstKickoff: true,
  /** Minutes before the first kick-off when the lock already applies. */
  graceMinutes: 0,
} as const;

/** Notification lead time before a favourite team's kick-off. */
export const NOTIFY_MINUTES_BEFORE = 60;

/** How many previous states the local undo history keeps. */
export const HISTORY_SIZE = 10;
