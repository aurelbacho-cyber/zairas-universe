import type { Fixture, Team } from '../types';
import { FORM_WEIGHT, HOME_ADVANTAGE, POT_ATTACK, POT_DEFENCE } from '../config/simulation';
import { isCounted } from './standings';

export type TeamStrength = {
  teamId: string;
  attack: number; // expected goals scored per match on neutral ground
  defence: number; // expected goals conceded per match
  /** Single number for "who is the favourite" comparisons. */
  rating: number;
};

/**
 * Blends the pot baseline with what has actually happened so far. A team with
 * no matches played is pure pot baseline; after all 8 matches the results carry
 * FORM_WEIGHT of the answer.
 */
export function computeStrengths(
  teams: Team[],
  fixtures: Fixture[],
  options: { before?: string } = {},
): Map<string, TeamStrength> {
  const played = fixtures
    .filter(isCounted)
    .filter((f) => (options.before ? f.date < options.before : true));

  const tally = new Map<string, { games: number; for: number; against: number }>();
  for (const t of teams) tally.set(t.id, { games: 0, for: 0, against: 0 });

  for (const f of played) {
    const h = tally.get(f.homeId);
    const a = tally.get(f.awayId);
    if (!h || !a || !f.score) continue;
    h.games++;
    a.games++;
    h.for += f.score.home;
    h.against += f.score.away;
    a.for += f.score.away;
    a.against += f.score.home;
  }

  const out = new Map<string, TeamStrength>();
  for (const team of teams) {
    const baseAttack = POT_ATTACK[team.pot];
    const baseDefence = POT_DEFENCE[team.pot];
    const t = tally.get(team.id)!;
    const weight = t.games === 0 ? 0 : FORM_WEIGHT * Math.min(1, t.games / 8);

    const attack = mix(baseAttack, t.games ? t.for / t.games : baseAttack, weight);
    const defence = mix(baseDefence, t.games ? t.against / t.games : baseDefence, weight);
    out.set(team.id, { teamId: team.id, attack, defence, rating: attack - defence });
  }
  return out;
}

const mix = (base: number, observed: number, weight: number) =>
  base * (1 - weight) + observed * weight;

/** Expected goals for a single match. */
export function expectedGoals(
  home: TeamStrength,
  away: TeamStrength,
): { home: number; away: number } {
  return {
    home: Math.max(0.1, ((home.attack + away.defence) / 2) * HOME_ADVANTAGE),
    away: Math.max(0.1, (away.attack + home.defence) / 2),
  };
}

/**
 * Who was expected to win, used only for the prediction upset bonus.
 * Home advantage counts, so the "favourite" is the side with the higher
 * expected goals. Returns undefined when the two are effectively level.
 */
export function favouriteOf(
  fixture: Fixture,
  strengths: Map<string, TeamStrength>,
): string | undefined {
  const home = strengths.get(fixture.homeId);
  const away = strengths.get(fixture.awayId);
  if (!home || !away) return undefined;
  const xg = expectedGoals(home, away);
  const margin = xg.home - xg.away;
  if (Math.abs(margin) < 0.15) return undefined; // too close to call
  return margin > 0 ? fixture.homeId : fixture.awayId;
}
