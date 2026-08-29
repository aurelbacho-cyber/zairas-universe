/// <reference lib="webworker" />
// Monte Carlo season simulation. Lives in a worker so a 10,000-run simulation
// never blocks the UI on a phone.

import type { Fixture, Team } from '../types';
import { MAX_GOALS, SIMULATION_RUNS } from '../config/simulation';
import { computeStrengths, expectedGoals, type TeamStrength } from '../lib/strength';
import { computeStandings, isCounted } from '../lib/standings';
import { makeRng } from '../lib/random';
import { BANDS } from '../config/rules';

export type SimulationRequest = {
  teams: Team[];
  fixtures: Fixture[];
  runs?: number;
  seed?: number;
};

export type SimulationRow = {
  teamId: string;
  top8: number; // probability 0..1
  top24: number;
  eliminated: number;
  averageRank: number;
  averagePoints: number;
};

export type SimulationResponse = {
  rows: SimulationRow[];
  runs: number;
  remainingMatches: number;
};

/** Draws a Poisson-distributed goal count (Knuth's method; means are small). */
function poisson(lambda: number, rng: () => number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > limit && k <= MAX_GOALS + 1);
  return Math.min(k - 1, MAX_GOALS);
}

function simulate(request: SimulationRequest): SimulationResponse {
  const { teams, fixtures } = request;
  const runs = request.runs ?? SIMULATION_RUNS;
  const rng = makeRng(request.seed ?? 20262027);

  const played = fixtures.filter(isCounted);
  const remaining = fixtures.filter((f) => !isCounted(f));
  const strengths = computeStrengths(teams, fixtures);

  // Pre-compute the expected goals of every remaining match once.
  const upcoming = remaining.map((f) => {
    const home = strengths.get(f.homeId) as TeamStrength;
    const away = strengths.get(f.awayId) as TeamStrength;
    const xg = expectedGoals(home, away);
    return { fixture: f, xg };
  });

  const tally = new Map(
    teams.map((t) => [t.id, { top8: 0, top24: 0, eliminated: 0, rankSum: 0, pointsSum: 0 }]),
  );

  for (let run = 0; run < runs; run++) {
    const simulated: Fixture[] = upcoming.map(({ fixture, xg }) => ({
      ...fixture,
      status: 'finished',
      score: { home: poisson(xg.home, rng), away: poisson(xg.away, rng) },
    }));

    const table = computeStandings(teams, [...played, ...simulated]);
    for (const row of table) {
      const t = tally.get(row.teamId)!;
      t.rankSum += row.rank;
      t.pointsSum += row.points;
      if (row.rank <= BANDS.directR16.to) t.top8++;
      if (row.rank <= BANDS.playoff.to) t.top24++;
      else t.eliminated++;
    }
  }

  const rows: SimulationRow[] = teams.map((team) => {
    const t = tally.get(team.id)!;
    return {
      teamId: team.id,
      top8: t.top8 / runs,
      top24: t.top24 / runs,
      eliminated: t.eliminated / runs,
      averageRank: t.rankSum / runs,
      averagePoints: t.pointsSum / runs,
    };
  });
  rows.sort((a, b) => a.averageRank - b.averageRank);

  return { rows, runs, remainingMatches: remaining.length };
}

self.onmessage = (event: MessageEvent<SimulationRequest>) => {
  try {
    const result = simulate(event.data);
    (self as unknown as Worker).postMessage({ ok: true, result });
  } catch (e) {
    (self as unknown as Worker).postMessage({ ok: false, error: (e as Error).message });
  }
};
