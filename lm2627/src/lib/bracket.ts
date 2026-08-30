import type { KnockoutTie, KnockoutRound, Score, StandingRow } from '../types';
import { KNOCKOUT } from '../config/rules';
import { ROUND_SIZES, directSeeds, tieId } from '../config/bracketTopology';

export type TieOutcome = {
  /** Aggregate over both legs, from teamA's point of view. */
  aggregate?: { a: number; b: number };
  winnerId?: string;
  /** How the tie was settled — shown in the UI. */
  decidedBy?: 'aggregate' | 'extraTime' | 'penalties';
  complete: boolean;
};

const legScoreFor = (
  tie: KnockoutTie,
  legIndex: 0 | 1,
): { a: number; b: number } | undefined => {
  const leg = tie.legs[legIndex];
  if (!leg?.score) return undefined;
  // Leg 1 is hosted by team B, leg 2 by team A (the higher seed hosts second).
  // The final is a single match on neutral ground, with team A listed first.
  const aIsHome = tie.round === 'F' ? true : legIndex === 1;
  return aIsHome
    ? { a: leg.score.home, b: leg.score.away }
    : { a: leg.score.away, b: leg.score.home };
};

/** The final is one match; every other round is played over two legs. */
export const isSingleMatch = (tie: KnockoutTie): boolean => tie.round === 'F';

/**
 * Resolves a tie: aggregate over both legs first (or the single result in the
 * final), then extra time, then penalties. There is no away-goals rule
 * (KNOCKOUT.awayGoalsRule === false).
 */
export function resolveTie(tie: KnockoutTie): TieOutcome {
  const first = legScoreFor(tie, 0);
  if (!first) return { complete: false };

  const second = isSingleMatch(tie) ? { a: 0, b: 0 } : legScoreFor(tie, 1);
  if (!second) return { complete: false };

  const aggregate = { a: first.a + second.a, b: first.b + second.b };

  if (aggregate.a !== aggregate.b) {
    return {
      aggregate,
      winnerId: aggregate.a > aggregate.b ? tie.teamAId : tie.teamBId,
      decidedBy: 'aggregate',
      complete: true,
    };
  }

  // Level after 180 minutes.
  if (KNOCKOUT.extraTime && tie.extraTime) {
    const et = tie.extraTime;
    // Extra time is played at team A's ground (the second leg), so home = A.
    if (et.home !== et.away) {
      return {
        aggregate: { a: aggregate.a + et.home, b: aggregate.b + et.away },
        winnerId: et.home > et.away ? tie.teamAId : tie.teamBId,
        decidedBy: 'extraTime',
        complete: true,
      };
    }
  }

  if (KNOCKOUT.penalties && tie.penalties) {
    const p = tie.penalties;
    if (p.home !== p.away) {
      return {
        aggregate,
        winnerId: p.home > p.away ? tie.teamAId : tie.teamBId,
        decidedBy: 'penalties',
        complete: true,
      };
    }
  }

  // Level and nothing to separate them yet — the tie is still open.
  return { aggregate, complete: false };
}

/**
 * Recomputes every winner and pushes them into the next round. Runs from the
 * play-off round forward so a change in the play-offs ripples all the way to
 * the final in a single pass.
 */
export function propagateWinners(ties: KnockoutTie[]): KnockoutTie[] {
  const byId = new Map(ties.map((t) => [t.id, { ...t }]));
  const order: KnockoutRound[] = ['PO', 'R16', 'QF', 'SF', 'F'];

  for (const round of order) {
    const inRound = [...byId.values()]
      .filter((t) => t.round === round)
      .sort((a, b) => a.slot - b.slot);

    for (const tie of inRound) {
      const outcome = resolveTie(tie);
      const winnerId = outcome.complete ? outcome.winnerId : undefined;
      tie.winnerId = winnerId;

      if (!tie.feedsInto || !tie.feedsSide) continue;
      const next = byId.get(tie.feedsInto);
      if (!next) continue;

      const key = tie.feedsSide === 'A' ? 'teamAId' : 'teamBId';
      const previous = next[key];

      // With no winner yet we only take back a team this tie put there itself.
      // Anything else was filled in by hand — the bracket can be used before
      // the earlier rounds are played, and that must not be wiped.
      const wasPropagatedFromHere =
        previous !== undefined && (previous === tie.teamAId || previous === tie.teamBId);
      if (!winnerId && !wasPropagatedFromHere) continue;

      if (previous !== winnerId) {
        next[key] = winnerId;
        // A changed participant invalidates any result already entered here.
        if (previous !== undefined) {
          next.legs = [clearLegTeams(next.legs[0]), clearLegTeams(next.legs[1])];
          next.extraTime = undefined;
          next.penalties = undefined;
          next.winnerId = undefined;
        }
      }
    }
  }

  return [...byId.values()].sort(
    (a, b) => order.indexOf(a.round) - order.indexOf(b.round) || a.slot - b.slot,
  );
}

/** Keeps a leg's chronicle entries but drops its result. */
function clearLegTeams(leg: KnockoutTie['legs'][0]) {
  if (!leg) return undefined;
  const { score: _score, ...rest } = leg;
  return Object.keys(rest).length ? rest : undefined;
}

/**
 * Fills the play-off and round-of-16 ties from the final league table.
 * The play-off draw is random in reality, so this only seeds the positions
 * (9 v 24, 10 v 23, ...) — teams can be swapped by hand afterwards.
 */
export function seedBracketFromTable(ties: KnockoutTie[], table: StandingRow[]): KnockoutTie[] {
  const teamAt = (position: number) => table[position - 1]?.teamId;
  const next = ties.map((t) => ({ ...t }));
  const byId = new Map(next.map((t) => [t.id, t]));

  for (const { round, count } of ROUND_SIZES) {
    for (let slot = 1; slot <= count; slot++) {
      const tie = byId.get(tieId(round, slot));
      if (!tie) continue;
      const seeds = directSeeds(round, slot);
      if (seeds.a !== undefined) tie.teamAId = teamAt(seeds.a);
      if (seeds.b !== undefined) tie.teamBId = teamAt(seeds.b);
    }
  }
  return propagateWinners(next);
}

/** Every tie a team appears in, ordered from the play-offs to the final. */
export function teamPath(ties: KnockoutTie[], teamId: string | undefined): Set<string> {
  const path = new Set<string>();
  if (!teamId) return path;
  for (const tie of ties) {
    if (tie.teamAId === teamId || tie.teamBId === teamId) path.add(tie.id);
  }
  return path;
}

/** Aggregate line for display, e.g. "3:2". */
export function aggregateLabel(tie: KnockoutTie): string | undefined {
  const outcome = resolveTie(tie);
  if (!outcome.aggregate) return undefined;
  return `${outcome.aggregate.a}:${outcome.aggregate.b}`;
}

export function emptyScore(): Score {
  return { home: 0, away: 0 };
}
