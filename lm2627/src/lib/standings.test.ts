import { describe, expect, it } from 'vitest';
import { computeStandings, positionHistory } from './standings';
import { fixture, team } from './testUtils';
import type { Team } from '../types';

const teams: Team[] = [team('a'), team('b'), team('c'), team('d')];

describe('computeStandings', () => {
  it('awards 3 for a win, 1 for a draw, 0 for a loss', () => {
    const table = computeStandings(teams, [
      fixture('1', 'a', 'b', [2, 0]),
      fixture('2', 'c', 'd', [1, 1]),
    ]);
    const row = (id: string) => table.find((r) => r.teamId === id)!;
    expect(row('a').points).toBe(3);
    expect(row('b').points).toBe(0);
    expect(row('c').points).toBe(1);
    expect(row('d').points).toBe(1);
    expect(row('a').rank).toBe(1);
  });

  it('ignores matches that have no score yet', () => {
    const table = computeStandings(teams, [fixture('1', 'a', 'b')]);
    expect(table.every((r) => r.played === 0)).toBe(true);
  });

  it('separates equal points on goal difference, then goals scored', () => {
    // a: +2 (3:1). b: +2 (5:3) — same GD, more goals, so b ranks first.
    const table = computeStandings(teams, [
      fixture('1', 'a', 'c', [3, 1]),
      fixture('2', 'b', 'd', [5, 3]),
    ]);
    expect(table[0].teamId).toBe('b');
    expect(table[1].teamId).toBe('a');
  });

  it('falls through to away goals when points and goals are equal', () => {
    // Both win 2:1, but b won away, so b has the away goals.
    const table = computeStandings(teams, [
      fixture('1', 'a', 'c', [2, 1]),
      fixture('2', 'd', 'b', [1, 2]),
    ]);
    expect(table[0].teamId).toBe('b');
    expect(table[0].awayGoalsFor).toBe(2);
    expect(table[0].awayWins).toBe(1);
  });

  it('uses the club coefficient as the final separator', () => {
    const withCoefficients: Team[] = [
      team('a', 1, { coefficient: 10 }),
      team('b', 1, { coefficient: 90 }),
    ];
    // Identical records in every respect.
    const table = computeStandings(withCoefficients, [fixture('1', 'a', 'b', [1, 1])]);
    expect(table[0].teamId).toBe('b');
  });

  it('records the running form, most recent first', () => {
    const table = computeStandings(teams, [
      fixture('1', 'a', 'b', [1, 0], 1, '2026-09-08T19:00:00Z'),
      fixture('2', 'a', 'c', [0, 0], 2, '2026-10-13T19:00:00Z'),
      fixture('3', 'd', 'a', [3, 0], 3, '2026-10-20T19:00:00Z'),
    ]);
    expect(table.find((r) => r.teamId === 'a')!.form).toEqual(['L', 'D', 'W']);
  });

  it('tracks the position after each matchday', () => {
    const history = positionHistory(
      teams,
      [
        fixture('1', 'a', 'b', [1, 0], 1),
        fixture('2', 'c', 'd', [4, 0], 2, '2026-10-13T19:00:00Z'),
      ],
      2,
    );
    expect(history).toHaveLength(2);
    expect(history[0].positions.a).toBe(1);
    // c's 4:0 in matchday 2 lifts it above a on goal difference.
    expect(history[1].positions.c).toBe(1);
  });
});
