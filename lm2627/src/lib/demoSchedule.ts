// ---------------------------------------------------------------------------
// DEMO SCHEDULE GENERATOR
//
// The real 144-match schedule is NOT in this app — it is published by UEFA and
// imported by hand. This generator exists only so the app can be tried out
// before then. Everything it produces is fake and is flagged as such
// (`fixturesAreDemo`), and one tap wipes it.
//
// It does obey the real draw constraints, so the output passes the same
// validator a real schedule has to pass:
//   144 matches · 8 per team · 4 home + 4 away · 2 opponents from each pot ·
//   no opponent twice · 18 matches per matchday · nobody plays twice in a round
// ---------------------------------------------------------------------------

import type { Fixture, Matchday, Team, Pot } from '../types';
import { MATCHDAYS } from '../config/calendar';
import { makeRng, shuffle } from './random';

type Pairing = { homeIndex: number; awayIndex: number };

/**
 * Builds the match set. Teams are indexed pot-major: index = pot * 9 + i.
 *
 * Within a pot the 9 teams form a directed cycle (i hosts i+1), giving each
 * team one home and one away match against its own pot. Between two pots the
 * lower pot hosts on the diagonal (i vs i) and the higher pot hosts on the
 * shifted diagonal (i vs i+1), which gives both sides one home and one away
 * match and never repeats a pairing.
 */
function buildPairings(perPot: number): Pairing[] {
  const idx = (pot: number, i: number) => pot * perPot + i;
  const out: Pairing[] = [];
  for (let p = 0; p < 4; p++) {
    for (let i = 0; i < perPot; i++) {
      out.push({ homeIndex: idx(p, i), awayIndex: idx(p, (i + 1) % perPot) });
    }
  }
  for (let p = 0; p < 4; p++) {
    for (let q = p + 1; q < 4; q++) {
      for (let i = 0; i < perPot; i++) {
        out.push({ homeIndex: idx(p, i), awayIndex: idx(q, i) });
        out.push({ homeIndex: idx(q, i), awayIndex: idx(p, (i + 1) % perPot) });
      }
    }
  }
  return out;
}

/**
 * Splits the matches into 8 matchdays so that every team plays exactly once per
 * matchday — i.e. decomposes the 8-regular graph into 8 perfect matchings.
 * Each matchday is found by exact backtracking (always expanding the most
 * constrained team first); a greedy split can paint itself into a corner, so a
 * failed attempt just restarts with the next seed.
 */
function assignMatchdays(pairings: Pairing[], teamCount: number, seed: number): number[] | null {
  const NODE_BUDGET = 200_000;
  const rng = makeRng(seed);

  // adjacency: team -> list of [otherTeam, pairingIndex]
  const adj: Array<Array<[number, number]>> = Array.from({ length: teamCount }, () => []);
  pairings.forEach((p, i) => {
    adj[p.homeIndex].push([p.awayIndex, i]);
    adj[p.awayIndex].push([p.homeIndex, i]);
  });

  const used = new Array<boolean>(pairings.length).fill(false);
  const matchday = new Array<number>(pairings.length).fill(-1);

  for (let day = 0; day < 8; day++) {
    const free = new Array<boolean>(teamCount).fill(true);
    const picked: number[] = [];
    let nodes = 0;

    const options = (team: number) => adj[team].filter(([o, e]) => !used[e] && free[o]);

    const search = (remaining: number): boolean => {
      if (++nodes > NODE_BUDGET) return false;
      if (remaining === 0) return true;
      // most constrained free team first
      let best = -1;
      let bestCount = Infinity;
      for (let t = 0; t < teamCount; t++) {
        if (!free[t]) continue;
        const c = options(t).length;
        if (c < bestCount) {
          bestCount = c;
          best = t;
        }
      }
      if (best < 0 || bestCount === 0) return false;

      for (const [other, edge] of shuffle(options(best), rng)) {
        free[best] = false;
        free[other] = false;
        used[edge] = true;
        picked.push(edge);
        if (search(remaining - 2)) return true;
        picked.pop();
        used[edge] = false;
        free[best] = true;
        free[other] = true;
      }
      return false;
    };

    if (!search(teamCount)) return null;
    for (const e of picked) matchday[e] = day;
  }
  return matchday;
}

export type DemoScheduleResult =
  | { ok: true; fixtures: Fixture[]; seed: number }
  | { ok: false; error: string };

/** Generates a full, rule-compliant fake schedule for the given 36 teams. */
export function generateDemoSchedule(teams: Team[], startSeed = 1): DemoScheduleResult {
  const perPot = 9;
  const byPot: Record<Pot, Team[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const t of teams) byPot[t.pot].push(t);
  for (const pot of [1, 2, 3, 4] as Pot[]) {
    if (byPot[pot].length !== perPot) {
      return {
        ok: false,
        error: `Kôš ${pot} má ${byPot[pot].length} tímov, potrebných je ${perPot}. Ukážkový rozpis sa nedá vygenerovať.`,
      };
    }
  }
  const ordered = ([1, 2, 3, 4] as Pot[]).flatMap((pot) => byPot[pot]);
  const pairings = buildPairings(perPot);

  let matchday: number[] | null = null;
  let usedSeed = startSeed;
  for (let attempt = 0; attempt < 40 && !matchday; attempt++) {
    usedSeed = startSeed + attempt;
    matchday = assignMatchdays(pairings, ordered.length, usedSeed);
  }
  if (!matchday) {
    return { ok: false, error: 'Nepodarilo sa rozdeliť zápasy do kôl. Skús to znova.' };
  }

  const fixtures: Fixture[] = pairings.map((p, i) => {
    const md = (matchday![i] + 1) as Matchday;
    const home = ordered[p.homeIndex];
    const away = ordered[p.awayIndex];
    return {
      id: `demo-md${md}-${home.id}-${away.id}`,
      matchday: md,
      date: demoKickoff(md, i),
      homeId: home.id,
      awayId: away.id,
      status: 'scheduled',
      watchedTogether: false,
    };
  });

  fixtures.sort((a, b) => a.matchday - b.matchday || a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return { ok: true, fixtures, seed: usedSeed };
}

/** Spreads a matchday's 18 matches over its published window at 18:45 / 21:00 CET. */
function demoKickoff(matchday: Matchday, index: number): string {
  const window = MATCHDAYS.find((m) => m.matchday === matchday)!;
  const from = new Date(`${window.from}T00:00:00Z`);
  const to = new Date(`${window.to}T00:00:00Z`);
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const day = new Date(from.getTime() + (index % days) * 86_400_000);
  // 18:45 and 21:00 CET ≈ 16:45 / 19:00 UTC in autumn, close enough for demo data.
  const hour = index % 2 === 0 ? 19 : 16;
  const minute = index % 2 === 0 ? 0 : 45;
  day.setUTCHours(hour, minute, 0, 0);
  return day.toISOString();
}
