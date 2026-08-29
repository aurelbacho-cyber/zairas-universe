// Domain model for the Champions League 2026/27 companion app.
// Shapes follow the project specification exactly; anything added on top is
// marked as an extension so an imported file from the spec still validates.

export type Pot = 1 | 2 | 3 | 4;
export type Matchday = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Rating = 1 | 2 | 3 | 4 | 5;
export type KnockoutRound = 'PO' | 'R16' | 'QF' | 'SF' | 'F';

export type Team = {
  id: string; // 'slovan'
  name: string; // 'ŠK Slovan Bratislava'
  short: string; // 'SLO'
  country: string; // 'SVK'
  pot: Pot;
  colors: { primary: string; secondary: string };
  crestUrl?: string;
  /**
   * Extension (not in the original spec): UEFA club coefficient, used as the
   * last tiebreaker. Left null until the real values are filled in by hand —
   * see NOTES.md. Missing values are treated as 0.
   */
  coefficient?: number | null;
};

export type Score = { home: number; away: number };

export type Fixture = {
  id: string;
  matchday: Matchday;
  date: string; // ISO
  homeId: string;
  awayId: string;
  status: 'scheduled' | 'live' | 'finished';
  score?: Score;
  watchedTogether: boolean; // pozerali sme spolu?
  rating?: Rating; // hodnotenie zápasu hviezdičkami
  note?: string; // poznámka do kroniky
  momentOfMatch?: string;
  photoDataUrl?: string; // fotka/selfie z pozerania
};

/** One leg of a two-legged knockout tie. */
export type Leg = {
  date?: string; // ISO
  homeId?: string;
  awayId?: string;
  score?: Score;
  /** Chronicle fields, same idea as on a league fixture. */
  watchedTogether?: boolean;
  rating?: Rating;
  note?: string;
  momentOfMatch?: string;
  photoDataUrl?: string;
};

export type KnockoutTie = {
  id: string;
  round: KnockoutRound;
  slot: number; // pozícia v pavúku
  legs: [Leg?, Leg?];
  /** Participants; filled by seeding or propagated from an earlier round. */
  teamAId?: string; // higher seed — hosts the second leg
  teamBId?: string;
  extraTime?: Score;
  penalties?: Score;
  winnerId?: string;
  feedsInto?: string; // id ďalšieho ties
  /** Which side of the next tie the winner occupies. */
  feedsSide?: 'A' | 'B';
};

export type Prediction = {
  userId: string;
  fixtureId: string;
  home: number;
  away: number;
  lockedAt: string;
};

export type Profile = {
  id: string;
  name: string;
  avatarEmoji: string;
  favouriteTeamId?: string;
};

/** "Veľká predpoveď sezóny" — sealed in September, opened on final day. */
export type SeasonPrediction = {
  userId: string;
  winnerId?: string;
  finalistIds: [string?, string?];
  topScorer?: string;
  lastPlaceId?: string;
  sealedAt?: string;
};

export type BadgeId = string;

export type Badge = {
  id: BadgeId;
  title: string;
  description: string;
  emoji: string;
};

export type EarnedBadge = {
  badgeId: BadgeId;
  userId: string;
  earnedAt: string;
};

export type Settings = {
  theme: 'dark' | 'light';
  kidMode: boolean;
  soundOn: boolean;
  activeProfileId: string;
  notificationsEnabled: boolean;
};

/** Everything that makes up a season; this is what export/import round-trips. */
export type SeasonState = {
  schemaVersion: number;
  teams: Team[];
  fixtures: Fixture[];
  fixturesAreDemo: boolean;
  ties: KnockoutTie[];
  profiles: Profile[];
  predictions: Prediction[];
  seasonPredictions: SeasonPrediction[];
  earnedBadges: EarnedBadge[];
  settings: Settings;
  updatedAt: string;
};

/** A row of the league table. */
export type StandingRow = {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  awayGoalsFor: number;
  awayWins: number;
  disciplinaryPoints: number;
  coefficient: number;
  /** Most recent results first: 'W' | 'D' | 'L'. */
  form: Array<'W' | 'D' | 'L'>;
  rank: number;
};
