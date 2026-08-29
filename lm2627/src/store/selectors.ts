import { useMemo } from 'react';
import { useSeasonStore } from './useSeasonStore';
import { computeStandings } from '../lib/standings';
import { scoreAll, leaderboard } from '../lib/scoring';
import { propagateWinners } from '../lib/bracket';
import type { KnockoutTie, SeasonState, Team } from '../types';

export function useTeams(): Team[] {
  return useSeasonStore((s) => s.teams);
}

export function useTeamMap(): Map<string, Team> {
  const teams = useTeams();
  return useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
}

export function useStandings() {
  const teams = useSeasonStore((s) => s.teams);
  const fixtures = useSeasonStore((s) => s.fixtures);
  return useMemo(() => computeStandings(teams, fixtures), [teams, fixtures]);
}

export function usePredictionResults() {
  const teams = useSeasonStore((s) => s.teams);
  const fixtures = useSeasonStore((s) => s.fixtures);
  const predictions = useSeasonStore((s) => s.predictions);
  return useMemo(() => scoreAll(teams, fixtures, predictions), [teams, fixtures, predictions]);
}

export function useLeaderboard() {
  const profiles = useSeasonStore((s) => s.profiles);
  const results = usePredictionResults();
  return useMemo(() => leaderboard(profiles, results), [profiles, results]);
}

export function useActiveProfile() {
  const profiles = useSeasonStore((s) => s.profiles);
  const activeId = useSeasonStore((s) => s.settings.activeProfileId);
  return profiles.find((p) => p.id === activeId) ?? profiles[0];
}

/**
 * The bracket as it should be displayed. In "Čo ak…" mode the hypothetical
 * winners are layered on top; the stored ties are never touched.
 */
export function useDisplayTies(): { ties: KnockoutTie[]; hypothetical: Set<string> } {
  const ties = useSeasonStore((s) => s.ties);
  const whatIf = useSeasonStore((s) => s.whatIf);
  const active = useSeasonStore((s) => s.whatIfActive);

  return useMemo(() => {
    if (!active) return { ties, hypothetical: new Set<string>() };

    const hypothetical = new Set<string>();
    const overlaid = ties.map((tie) => {
      const forced = whatIf[tie.id];
      if (!forced || tie.winnerId === forced) return tie;
      hypothetical.add(tie.id);
      return { ...tie, winnerId: forced };
    });

    // Push the hypothetical winners forward without writing anything back.
    const byId = new Map(overlaid.map((t) => [t.id, { ...t }]));
    for (const tie of overlaid) {
      if (!tie.winnerId || !tie.feedsInto || !tie.feedsSide) continue;
      const next = byId.get(tie.feedsInto);
      if (!next) continue;
      const key = tie.feedsSide === 'A' ? 'teamAId' : 'teamBId';
      if (next[key] !== tie.winnerId) {
        next[key] = tie.winnerId;
        hypothetical.add(next.id);
      }
    }

    // Re-run the real resolution so ties that already have results still show
    // their genuine winner where no hypothesis overrides it.
    const result = [...byId.values()].map((t) => {
      const forced = whatIf[t.id];
      return forced ? { ...t, winnerId: forced } : t;
    });
    return { ties: cascade(result, whatIf, hypothetical), hypothetical };
  }, [ties, whatIf, active]);
}

/** Repeats the forward pass until the whole bracket settles. */
function cascade(
  ties: KnockoutTie[],
  whatIf: Record<string, string | undefined>,
  hypothetical: Set<string>,
): KnockoutTie[] {
  let current = ties;
  for (let pass = 0; pass < 5; pass++) {
    const byId = new Map(current.map((t) => [t.id, { ...t }]));
    for (const tie of [...byId.values()].sort(byRound)) {
      const forced = whatIf[tie.id];
      if (forced) {
        tie.winnerId = forced;
        hypothetical.add(tie.id);
      }
      if (!tie.winnerId || !tie.feedsInto || !tie.feedsSide) continue;
      const next = byId.get(tie.feedsInto);
      if (!next) continue;
      const key = tie.feedsSide === 'A' ? 'teamAId' : 'teamBId';
      if (next[key] !== tie.winnerId) {
        next[key] = tie.winnerId;
        if (hypothetical.has(tie.id)) hypothetical.add(next.id);
      }
    }
    current = [...byId.values()].sort(byRound);
  }
  return current;
}

const ROUND_ORDER = ['PO', 'R16', 'QF', 'SF', 'F'];
const byRound = (a: KnockoutTie, b: KnockoutTie) =>
  ROUND_ORDER.indexOf(a.round) - ROUND_ORDER.indexOf(b.round) || a.slot - b.slot;

/** Real (non-hypothetical) bracket, kept resolved. */
export function useRealTies(): KnockoutTie[] {
  const ties = useSeasonStore((s) => s.ties);
  return useMemo(() => propagateWinners(ties), [ties]);
}

/**
 * Stable snapshot of the persisted season. Selecting whole objects from Zustand
 * would build a new value on every call, which React's useSyncExternalStore
 * rejects — so each field is selected separately and memoised.
 */
export function useSeasonSnapshot(): SeasonState {
  const schemaVersion = useSeasonStore((s) => s.schemaVersion);
  const teams = useSeasonStore((s) => s.teams);
  const fixtures = useSeasonStore((s) => s.fixtures);
  const fixturesAreDemo = useSeasonStore((s) => s.fixturesAreDemo);
  const ties = useSeasonStore((s) => s.ties);
  const profiles = useSeasonStore((s) => s.profiles);
  const predictions = useSeasonStore((s) => s.predictions);
  const seasonPredictions = useSeasonStore((s) => s.seasonPredictions);
  const earnedBadges = useSeasonStore((s) => s.earnedBadges);
  const settings = useSeasonStore((s) => s.settings);
  const updatedAt = useSeasonStore((s) => s.updatedAt);

  return useMemo(
    () => ({
      schemaVersion,
      teams,
      fixtures,
      fixturesAreDemo,
      ties,
      profiles,
      predictions,
      seasonPredictions,
      earnedBadges,
      settings,
      updatedAt,
    }),
    [
      schemaVersion,
      teams,
      fixtures,
      fixturesAreDemo,
      ties,
      profiles,
      predictions,
      seasonPredictions,
      earnedBadges,
      settings,
      updatedAt,
    ],
  );
}
