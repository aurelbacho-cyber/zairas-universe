import type { Fixture, StandingRow, Team } from '../types';
import { POINTS, tiebreakers } from '../config/rules';

const emptyRow = (team: Team): StandingRow => ({
  teamId: team.id,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDiff: 0,
  points: 0,
  awayGoalsFor: 0,
  awayWins: 0,
  // No card data is recorded anywhere in the app, so this is always 0 today.
  // It stays in the model because it is a tiebreaker — see NOTES.md.
  disciplinaryPoints: 0,
  coefficient: team.coefficient ?? 0,
  form: [],
  rank: 0,
});

/** Only finished matches with a score count towards the table. */
export const isCounted = (f: Fixture): boolean => f.status === 'finished' && !!f.score;

/**
 * Builds the league table. Rows are ranked by the configurable tiebreaker chain
 * in config/rules.ts; teams that are equal on every criterion are ordered
 * alphabetically so the table never jumps around at random.
 */
export function computeStandings(
  teams: Team[],
  fixtures: Fixture[],
  options: { upToMatchday?: number } = {},
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const t of teams) rows.set(t.id, emptyRow(t));

  const relevant = fixtures
    .filter(isCounted)
    .filter((f) => options.upToMatchday === undefined || f.matchday <= options.upToMatchday)
    .slice()
    .sort((a, b) => a.matchday - b.matchday || a.date.localeCompare(b.date));

  for (const f of relevant) {
    const home = rows.get(f.homeId);
    const away = rows.get(f.awayId);
    if (!home || !away || !f.score) continue;
    const { home: hg, away: ag } = f.score;

    home.played++;
    away.played++;
    home.goalsFor += hg;
    home.goalsAgainst += ag;
    away.goalsFor += ag;
    away.goalsAgainst += hg;
    away.awayGoalsFor += ag;

    if (hg > ag) {
      home.won++;
      away.lost++;
      home.points += POINTS.win;
      away.points += POINTS.loss;
      home.form.unshift('W');
      away.form.unshift('L');
    } else if (hg < ag) {
      away.won++;
      away.awayWins++;
      home.lost++;
      away.points += POINTS.win;
      home.points += POINTS.loss;
      away.form.unshift('W');
      home.form.unshift('L');
    } else {
      home.drawn++;
      away.drawn++;
      home.points += POINTS.draw;
      away.points += POINTS.draw;
      home.form.unshift('D');
      away.form.unshift('D');
    }
  }

  const byName = new Map(teams.map((t) => [t.id, t.name]));
  const table = [...rows.values()];
  for (const row of table) row.goalDiff = row.goalsFor - row.goalsAgainst;

  table.sort((a, b) => compareRows(a, b, byName));
  table.forEach((row, i) => {
    row.rank = i + 1;
  });
  return table;
}

/** Walks the configured tiebreaker chain in order. */
export function compareRows(a: StandingRow, b: StandingRow, names?: Map<string, string>): number {
  for (const tb of tiebreakers) {
    const av = tb.value(a);
    const bv = tb.value(b);
    if (av !== bv) return tb.lowerIsBetter ? av - bv : bv - av;
  }
  const an = names?.get(a.teamId) ?? a.teamId;
  const bn = names?.get(b.teamId) ?? b.teamId;
  return an.localeCompare(bn, 'sk');
}

/**
 * Which criterion actually separated two neighbouring rows — used to explain
 * the table ("o lepší gólový rozdiel").
 */
export function decidingTiebreaker(a: StandingRow, b: StandingRow): string | undefined {
  for (const tb of tiebreakers) {
    if (tb.value(a) !== tb.value(b)) return tb.id === 'points' ? undefined : tb.label;
  }
  return undefined;
}

/** Position of every team after each matchday — feeds the team detail chart. */
export function positionHistory(
  teams: Team[],
  fixtures: Fixture[],
  matchdays = 8,
): Array<{ matchday: number; positions: Record<string, number>; points: Record<string, number> }> {
  const out = [];
  for (let md = 1; md <= matchdays; md++) {
    const played = fixtures.some((f) => f.matchday === md && isCounted(f));
    if (!played) continue;
    const table = computeStandings(teams, fixtures, { upToMatchday: md });
    const positions: Record<string, number> = {};
    const points: Record<string, number> = {};
    for (const row of table) {
      positions[row.teamId] = row.rank;
      points[row.teamId] = row.points;
    }
    out.push({ matchday: md, positions, points });
  }
  return out;
}

/** All matches involving a team, in chronological order. */
export function teamFixtures(teamId: string, fixtures: Fixture[]): Fixture[] {
  return fixtures
    .filter((f) => f.homeId === teamId || f.awayId === teamId)
    .slice()
    .sort((a, b) => a.matchday - b.matchday || a.date.localeCompare(b.date));
}
