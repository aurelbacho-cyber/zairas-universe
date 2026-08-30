import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-in for IndexedDB so the store can be exercised in node.
const db = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: async (key: string) => db.get(key),
  set: async (key: string, value: unknown) => {
    db.set(key, value);
  },
  del: async (key: string) => {
    db.delete(key);
  },
}));

const { useSeasonStore, createInitialState } = await import('./useSeasonStore');
const { fixture } = await import('../lib/testUtils');
type HistoryEntry = { label: string; state: { fixtures: Array<{ score?: { home: number } }> } };

const history = () => (db.get('lm2627:history') ?? []) as HistoryEntry[];

/** Lets the debounced save fire and its promise settle. */
const flush = () => vi.advanceTimersByTimeAsync(600);

describe('season store persistence', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    db.clear();
    useSeasonStore.setState({ ...createInitialState(), history: [], whatIf: {}, whatIfActive: false });
    useSeasonStore.getState().replaceFixtures([fixture('m1', 'a', 'b')], false);
    await flush();
    db.set('lm2627:history', []);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves the season to storage after a change', async () => {
    useSeasonStore.getState().bumpScore('m1', 'home', 1);
    await flush();
    const saved = db.get('lm2627:season') as { fixtures: Array<{ score?: { home: number } }> };
    expect(saved.fixtures[0].score).toEqual({ home: 1, away: 0 });
  });

  it('turns a burst of taps into one undo point taken before the burst', async () => {
    const store = useSeasonStore.getState();
    store.bumpScore('m1', 'home', 1);
    store.bumpScore('m1', 'home', 1);
    store.bumpScore('m1', 'home', 1);
    await flush();

    expect(useSeasonStore.getState().fixtures[0].score).toEqual({ home: 3, away: 0 });
    expect(history()).toHaveLength(1);
    // Undoing has to take back the whole burst, not just the last goal.
    expect(history()[0].state.fixtures[0].score).toBeUndefined();
  });

  it('keeps separate undo points for changes made apart in time', async () => {
    useSeasonStore.getState().bumpScore('m1', 'home', 1);
    await flush();
    useSeasonStore.getState().bumpScore('m1', 'away', 1);
    await flush();

    expect(history()).toHaveLength(2);
    expect(history()[0].state.fixtures[0].score).toEqual({ home: 1, away: 0 });
  });

  it('records a badge once and stays silent when nothing is new', async () => {
    const badge = [{ badgeId: 'first-exact', userId: 'otec', earnedAt: '2026-09-08T00:00:00.000Z' }];

    useSeasonStore.getState().awardBadges(badge);
    await flush();
    expect(useSeasonStore.getState().earnedBadges).toHaveLength(1);
    expect(history()).toHaveLength(1);

    // The badge check re-runs after every change; re-awarding must not write
    // anything or it would flood the undo history.
    useSeasonStore.getState().awardBadges(badge);
    useSeasonStore.getState().awardBadges(badge);
    await flush();
    expect(useSeasonStore.getState().earnedBadges).toHaveLength(1);
    expect(history()).toHaveLength(1);
  });

  it('restores a previous state from the history', async () => {
    useSeasonStore.getState().bumpScore('m1', 'home', 2);
    await flush();

    const point = (db.get('lm2627:history') as Array<{ savedAt: string }>)[0];
    useSeasonStore.setState({ history: db.get('lm2627:history') as never });
    useSeasonStore.getState().restoreFromHistory(point.savedAt);
    await flush();

    expect(useSeasonStore.getState().fixtures[0].score).toBeUndefined();
  });
});
