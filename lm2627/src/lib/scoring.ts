import type { Fixture, Prediction, Profile, Team } from '../types';
import { PREDICTION_LOCK, SCORING } from '../config/rules';
import { computeStrengths, favouriteOf } from './strength';
import { isCounted } from './standings';

export type PredictionResult = {
  fixtureId: string;
  userId: string;
  predicted: { home: number; away: number };
  actual?: { home: number; away: number };
  points: number;
  /** Which rule paid out. */
  kind: 'exact' | 'outcome' | 'miss' | 'pending';
  upsetBonus: boolean;
};

const outcomeOf = (home: number, away: number): 'H' | 'A' | 'D' =>
  home > away ? 'H' : home < away ? 'A' : 'D';

/** Scores one prediction against a finished match. */
export function scorePrediction(
  prediction: Prediction,
  fixture: Fixture,
  favouriteId: string | undefined,
): PredictionResult {
  const base: PredictionResult = {
    fixtureId: fixture.id,
    userId: prediction.userId,
    predicted: { home: prediction.home, away: prediction.away },
    points: 0,
    kind: 'pending',
    upsetBonus: false,
  };
  if (!isCounted(fixture) || !fixture.score) return base;

  const actual = fixture.score;
  const exact = prediction.home === actual.home && prediction.away === actual.away;
  const sameOutcome =
    outcomeOf(prediction.home, prediction.away) === outcomeOf(actual.home, actual.away);

  // The favourite lost if it was beaten — a draw is not an upset here.
  const loserId =
    actual.home === actual.away
      ? undefined
      : actual.home > actual.away
        ? fixture.awayId
        : fixture.homeId;
  const upset = exact && !!favouriteId && favouriteId === loserId;

  const points = exact
    ? SCORING.exact + (upset ? SCORING.upsetBonus : 0)
    : sameOutcome
      ? SCORING.outcome
      : SCORING.miss;

  return {
    ...base,
    actual,
    points,
    kind: exact ? 'exact' : sameOutcome ? 'outcome' : 'miss',
    upsetBonus: upset,
  };
}

/** Scores every prediction across the season. */
export function scoreAll(
  teams: Team[],
  fixtures: Fixture[],
  predictions: Prediction[],
): PredictionResult[] {
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  const strengths = computeStrengths(teams, fixtures);
  const favouriteCache = new Map<string, string | undefined>();

  return predictions.flatMap((p) => {
    const fixture = byId.get(p.fixtureId);
    if (!fixture) return [];
    if (!favouriteCache.has(fixture.id)) {
      favouriteCache.set(fixture.id, favouriteOf(fixture, strengths));
    }
    return [scorePrediction(p, fixture, favouriteCache.get(fixture.id))];
  });
}

export type LeaderboardRow = {
  profile: Profile;
  points: number;
  exact: number;
  outcome: number;
  miss: number;
  upsets: number;
  predictions: number;
  rank: number;
};

export function leaderboard(
  profiles: Profile[],
  results: PredictionResult[],
): LeaderboardRow[] {
  const rows = profiles.map<LeaderboardRow>((profile) => {
    const mine = results.filter((r) => r.userId === profile.id);
    return {
      profile,
      points: mine.reduce((s, r) => s + r.points, 0),
      exact: mine.filter((r) => r.kind === 'exact').length,
      outcome: mine.filter((r) => r.kind === 'outcome').length,
      miss: mine.filter((r) => r.kind === 'miss').length,
      upsets: mine.filter((r) => r.upsetBonus).length,
      predictions: mine.length,
      rank: 0,
    };
  });
  rows.sort((a, b) => b.points - a.points || b.exact - a.exact || a.profile.name.localeCompare(b.profile.name, 'sk'));
  // Equal points share a rank.
  rows.forEach((row, i) => {
    row.rank = i > 0 && rows[i - 1].points === row.points ? rows[i - 1].rank : i + 1;
  });
  return rows;
}

/** Points a profile scored in one matchday. */
export function matchdayPoints(
  results: PredictionResult[],
  fixtures: Fixture[],
  matchday: number,
): Map<string, number> {
  const ids = new Set(fixtures.filter((f) => f.matchday === matchday).map((f) => f.id));
  const out = new Map<string, number>();
  for (const r of results) {
    if (!ids.has(r.fixtureId)) continue;
    out.set(r.userId, (out.get(r.userId) ?? 0) + r.points);
  }
  return out;
}

// ---------------------------------------------------------------------------
// LOCKING
// ---------------------------------------------------------------------------

/** Kick-off of the first match of a matchday — the moment tips lock. */
export function matchdayLockTime(fixtures: Fixture[], matchday: number): Date | undefined {
  const dates = fixtures
    .filter((f) => f.matchday === matchday && f.date)
    .map((f) => Date.parse(f.date))
    .filter((n) => !Number.isNaN(n));
  if (!dates.length) return undefined;
  return new Date(Math.min(...dates));
}

export function isMatchdayLocked(
  fixtures: Fixture[],
  matchday: number,
  now: Date = new Date(),
): boolean {
  if (!PREDICTION_LOCK.lockAtFirstKickoff) return false;
  const lock = matchdayLockTime(fixtures, matchday);
  if (!lock) return false;
  return now.getTime() >= lock.getTime() - PREDICTION_LOCK.graceMinutes * 60_000;
}
