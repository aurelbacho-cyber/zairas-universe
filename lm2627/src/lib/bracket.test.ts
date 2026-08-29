import { describe, expect, it } from 'vitest';
import { createEmptyBracket, R16_PAIRS } from '../config/bracketTopology';
import { propagateWinners, resolveTie, seedBracketFromTable, teamPath } from './bracket';
import { computeStandings } from './standings';
import { fixture, team } from './testUtils';
import type { KnockoutTie } from '../types';

const tie = (over: Partial<KnockoutTie> = {}): KnockoutTie => ({
  id: 'PO-1',
  round: 'PO',
  slot: 1,
  legs: [undefined, undefined],
  teamAId: 'a',
  teamBId: 'b',
  ...over,
});

describe('resolveTie', () => {
  it('is incomplete until both legs have a score', () => {
    expect(resolveTie(tie({ legs: [{ score: { home: 1, away: 0 } }, undefined] })).complete).toBe(
      false,
    );
  });

  it('adds both legs up, with leg 1 hosted by B and leg 2 by A', () => {
    // Leg 1: B 2–1 A. Leg 2: A 1–0 B. Aggregate A 2 – B 2.
    const outcome = resolveTie(
      tie({
        legs: [{ score: { home: 2, away: 1 } }, { score: { home: 1, away: 0 } }],
      }),
    );
    expect(outcome.aggregate).toEqual({ a: 2, b: 2 });
    expect(outcome.complete).toBe(false); // level, nothing to separate them yet
  });

  it('does not apply the away-goals rule', () => {
    // A scored 1 away, B scored 0 away — under away goals A would go through.
    const outcome = resolveTie(
      tie({ legs: [{ score: { home: 1, away: 1 } }, { score: { home: 0, away: 0 } }] }),
    );
    expect(outcome.aggregate).toEqual({ a: 1, b: 1 });
    expect(outcome.winnerId).toBeUndefined();
  });

  it('decides a level tie on extra time', () => {
    const outcome = resolveTie(
      tie({
        legs: [{ score: { home: 1, away: 1 } }, { score: { home: 0, away: 0 } }],
        extraTime: { home: 1, away: 0 },
      }),
    );
    expect(outcome.winnerId).toBe('a');
    expect(outcome.decidedBy).toBe('extraTime');
  });

  it('falls through extra time to penalties', () => {
    const outcome = resolveTie(
      tie({
        legs: [{ score: { home: 0, away: 0 } }, { score: { home: 0, away: 0 } }],
        extraTime: { home: 1, away: 1 },
        penalties: { home: 3, away: 5 },
      }),
    );
    expect(outcome.winnerId).toBe('b');
    expect(outcome.decidedBy).toBe('penalties');
  });

  it('wins on aggregate without needing extra time', () => {
    const outcome = resolveTie(
      tie({ legs: [{ score: { home: 0, away: 3 } }, { score: { home: 0, away: 1 } }] }),
    );
    expect(outcome.aggregate).toEqual({ a: 3, b: 1 });
    expect(outcome.winnerId).toBe('a');
    expect(outcome.decidedBy).toBe('aggregate');
  });
});

describe('bracket topology', () => {
  it('has 23 ties across the five rounds', () => {
    const bracket = createEmptyBracket();
    expect(bracket).toHaveLength(23);
    const count = (round: string) => bracket.filter((t) => t.round === round).length;
    expect([count('PO'), count('R16'), count('QF'), count('SF'), count('F')]).toEqual([
      8, 8, 4, 2, 1,
    ]);
  });

  it('keeps seeds 1 and 2 in opposite halves', () => {
    const bracket = createEmptyBracket();
    const halfOf = (seed: number): string => {
      const slot = R16_PAIRS.findIndex((p) => p.seed === seed) + 1;
      let current = bracket.find((t) => t.id === `R16-${slot}`)!;
      // Walk forward to the semi-final; its slot is the half.
      while (current.round !== 'SF') {
        current = bracket.find((t) => t.id === current.feedsInto)!;
      }
      return current.id;
    };
    expect(halfOf(1)).not.toBe(halfOf(2));
  });

  it('gives every play-off winner a distinct round-of-16 tie', () => {
    const targets = createEmptyBracket()
      .filter((t) => t.round === 'PO')
      .map((t) => t.feedsInto);
    expect(new Set(targets).size).toBe(8);
  });
});

describe('propagateWinners', () => {
  it('carries a winner into the next round', () => {
    const bracket = createEmptyBracket().map((t) =>
      t.id === 'PO-1'
        ? {
            ...t,
            teamAId: 'a',
            teamBId: 'b',
            legs: [{ score: { home: 0, away: 2 } }, { score: { home: 1, away: 0 } }] as KnockoutTie['legs'],
          }
        : t,
    );
    const resolved = propagateWinners(bracket);
    const po1 = resolved.find((t) => t.id === 'PO-1')!;
    expect(po1.winnerId).toBe('a');
    const next = resolved.find((t) => t.id === po1.feedsInto)!;
    expect(next.teamBId).toBe('a');
  });

  it('clears a later result when the participant changes underneath it', () => {
    let bracket = createEmptyBracket().map((t) =>
      t.id === 'PO-1'
        ? {
            ...t,
            teamAId: 'a',
            teamBId: 'b',
            legs: [{ score: { home: 0, away: 2 } }, { score: { home: 1, away: 0 } }] as KnockoutTie['legs'],
          }
        : t,
    );
    bracket = propagateWinners(bracket);

    const r16Id = bracket.find((t) => t.id === 'PO-1')!.feedsInto!;
    bracket = bracket.map((t) =>
      t.id === r16Id
        ? {
            ...t,
            teamAId: 'seed1',
            // Leg 1 at a's ground (0:1), leg 2 at seed1's (3:0) — seed1 wins 4:0.
            legs: [{ score: { home: 0, away: 1 } }, { score: { home: 3, away: 0 } }] as KnockoutTie['legs'],
          }
        : t,
    );
    bracket = propagateWinners(bracket);
    expect(bracket.find((t) => t.id === r16Id)!.winnerId).toBe('seed1');

    // Now flip the play-off result: b goes through instead.
    bracket = bracket.map((t) =>
      t.id === 'PO-1'
        ? { ...t, legs: [{ score: { home: 2, away: 0 } }, { score: { home: 0, away: 0 } }] as KnockoutTie['legs'] }
        : t,
    );
    bracket = propagateWinners(bracket);
    const r16 = bracket.find((t) => t.id === r16Id)!;
    expect(r16.teamBId).toBe('b');
    expect(r16.legs[0]?.score).toBeUndefined();
    expect(r16.winnerId).toBeUndefined();
  });
});

describe('seedBracketFromTable', () => {
  it('puts 9th against 24th and 1st into the round of 16', () => {
    // Build a 24-team table where team i wins exactly (24 - i) matches worth of
    // goals, so the finishing order is deterministic.
    const teams = Array.from({ length: 24 }, (_, i) => team(`t${i + 1}`));
    const fixtures = teams.map((t, i) =>
      fixture(`f${i}`, t.id, teams[(i + 1) % teams.length].id, [24 - i, 0]),
    );
    const table = computeStandings(teams, fixtures);
    const bracket = seedBracketFromTable(createEmptyBracket(), table);

    const po1 = bracket.find((t) => t.id === 'PO-1')!;
    expect(po1.teamAId).toBe(table[8].teamId); // 9th
    expect(po1.teamBId).toBe(table[23].teamId); // 24th

    const r16 = bracket.find((t) => t.id === 'R16-1')!;
    expect(r16.teamAId).toBe(table[0].teamId); // 1st
  });
});

describe('teamPath', () => {
  it('collects every tie a team appears in', () => {
    const bracket = createEmptyBracket().map((t) =>
      t.id === 'R16-1' ? { ...t, teamAId: 'x' } : t,
    );
    expect(teamPath(bracket, 'x')).toEqual(new Set(['R16-1']));
    expect(teamPath(bracket, undefined).size).toBe(0);
  });
});
