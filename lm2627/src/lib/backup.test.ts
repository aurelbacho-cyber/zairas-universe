import { describe, expect, it } from 'vitest';
import { buildBackup, parseBackup } from './backup';
import { createEmptyBracket } from '../config/bracketTopology';
import { fixture, team } from './testUtils';
import type { SeasonState } from '../types';

const state = (): SeasonState => ({
  schemaVersion: 1,
  teams: [team('a'), team('b')],
  fixtures: [{ ...fixture('m1', 'a', 'b', [2, 1]), watchedTogether: true, rating: 5, note: 'Skvelý zápas' }],
  fixturesAreDemo: false,
  ties: createEmptyBracket(),
  profiles: [{ id: 'otec', name: 'Otec', avatarEmoji: '🧔', favouriteTeamId: 'a' }],
  predictions: [{ userId: 'otec', fixtureId: 'm1', home: 2, away: 1, lockedAt: '2026-09-01T00:00:00.000Z' }],
  seasonPredictions: [{ userId: 'otec', winnerId: 'a', finalistIds: ['a', 'b'], sealedAt: '2026-09-15T00:00:00.000Z' }],
  earnedBadges: [{ badgeId: 'first-exact', userId: 'otec', earnedAt: '2026-09-09T00:00:00.000Z' }],
  settings: {
    theme: 'dark',
    kidMode: true,
    soundOn: true,
    activeProfileId: 'otec',
    notificationsEnabled: false,
  },
  updatedAt: '2026-09-09T00:00:00.000Z',
});

describe('export / import round-trip', () => {
  it('restores an identical state', () => {
    const original = state();
    const text = JSON.stringify(buildBackup(original));
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.state).toEqual(original);
  });

  it('accepts a bare state object from an older export', () => {
    const parsed = parseBackup(JSON.stringify(state()));
    expect(parsed.ok).toBe(true);
  });

  it('rejects a file that is not a backup', () => {
    expect(parseBackup('{"hello":"world"}').ok).toBe(false);
    expect(parseBackup('not json').ok).toBe(false);
  });
});
