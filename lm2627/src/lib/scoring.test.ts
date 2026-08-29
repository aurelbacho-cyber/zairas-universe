import { describe, expect, it } from 'vitest';
import { isMatchdayLocked, leaderboard, matchdayLockTime, scoreAll } from './scoring';
import { SCORING } from '../config/rules';
import { fixture, team } from './testUtils';
import type { Prediction, Profile, Team } from '../types';

// Pot 1 at home against pot 4 — a clear favourite, which is what the upset
// bonus depends on.
const teams: Team[] = [team('big', 1), team('small', 4)];
const profiles: Profile[] = [
  { id: 'otec', name: 'Otec', avatarEmoji: '🧔' },
  { id: 'syn', name: 'Syn', avatarEmoji: '🧒' },
];

const tip = (userId: string, home: number, away: number, fixtureId = 'm1'): Prediction => ({
  userId,
  fixtureId,
  home,
  away,
  lockedAt: '2026-09-01T00:00:00.000Z',
});

describe('prediction scoring', () => {
  it('pays 3 for an exact score', () => {
    const results = scoreAll(teams, [fixture('m1', 'big', 'small', [3, 1])], [tip('otec', 3, 1)]);
    expect(results[0].kind).toBe('exact');
    expect(results[0].points).toBe(SCORING.exact);
  });

  it('pays 1 for the right winner with the wrong score', () => {
    const results = scoreAll(teams, [fixture('m1', 'big', 'small', [3, 1])], [tip('otec', 2, 0)]);
    expect(results[0].kind).toBe('outcome');
    expect(results[0].points).toBe(SCORING.outcome);
  });

  it('pays 1 for correctly calling a draw', () => {
    const results = scoreAll(teams, [fixture('m1', 'big', 'small', [2, 2])], [tip('otec', 1, 1)]);
    expect(results[0].points).toBe(SCORING.outcome);
  });

  it('pays nothing for the wrong outcome', () => {
    const results = scoreAll(teams, [fixture('m1', 'big', 'small', [3, 1])], [tip('otec', 0, 2)]);
    expect(results[0].kind).toBe('miss');
    expect(results[0].points).toBe(0);
  });

  it('adds the upset bonus for an exact score where the favourite lost', () => {
    const results = scoreAll(teams, [fixture('m1', 'big', 'small', [0, 1])], [tip('otec', 0, 1)]);
    expect(results[0].upsetBonus).toBe(true);
    expect(results[0].points).toBe(SCORING.exact + SCORING.upsetBonus);
  });

  it('gives no upset bonus when the favourite won', () => {
    const results = scoreAll(teams, [fixture('m1', 'big', 'small', [2, 0])], [tip('otec', 2, 0)]);
    expect(results[0].upsetBonus).toBe(false);
    expect(results[0].points).toBe(SCORING.exact);
  });

  it('gives no upset bonus for a draw', () => {
    const results = scoreAll(teams, [fixture('m1', 'big', 'small', [1, 1])], [tip('otec', 1, 1)]);
    expect(results[0].upsetBonus).toBe(false);
  });

  it('leaves an unplayed match pending and worth nothing', () => {
    const results = scoreAll(teams, [fixture('m1', 'big', 'small')], [tip('otec', 1, 0)]);
    expect(results[0].kind).toBe('pending');
    expect(results[0].points).toBe(0);
  });
});

describe('leaderboard', () => {
  it('ranks by points and shares a rank on a tie', () => {
    const fixtures = [fixture('m1', 'big', 'small', [2, 1])];
    const rows = leaderboard(
      profiles,
      scoreAll(teams, fixtures, [tip('otec', 2, 1), tip('syn', 2, 1)]),
    );
    expect(rows[0].points).toBe(rows[1].points);
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(1);
  });

  it('puts the higher scorer first', () => {
    const fixtures = [fixture('m1', 'big', 'small', [2, 1])];
    const rows = leaderboard(
      profiles,
      scoreAll(teams, fixtures, [tip('otec', 2, 1), tip('syn', 1, 0)]),
    );
    expect(rows[0].profile.id).toBe('otec');
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(2);
  });
});

describe('prediction lock', () => {
  const fixtures = [
    fixture('m1', 'big', 'small', undefined, 1, '2026-09-08T19:00:00.000Z'),
    fixture('m2', 'small', 'big', undefined, 1, '2026-09-09T19:00:00.000Z'),
  ];

  it('locks at the first kick-off of the matchday', () => {
    expect(matchdayLockTime(fixtures, 1)?.toISOString()).toBe('2026-09-08T19:00:00.000Z');
  });

  it('is open a minute before and locked a minute after', () => {
    expect(isMatchdayLocked(fixtures, 1, new Date('2026-09-08T18:59:00Z'))).toBe(false);
    expect(isMatchdayLocked(fixtures, 1, new Date('2026-09-08T19:01:00Z'))).toBe(true);
  });

  it('stays open for a matchday with no fixtures', () => {
    expect(isMatchdayLocked(fixtures, 5, new Date('2027-01-01T00:00:00Z'))).toBe(false);
  });
});
