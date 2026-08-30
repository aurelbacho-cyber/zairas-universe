import { create } from 'zustand';
import teamsJson from '../data/teams.json';
import fixturesJson from '../data/fixtures.json';
import type {
  EarnedBadge,
  Fixture,
  KnockoutTie,
  Prediction,
  Profile,
  Rating,
  Score,
  SeasonPrediction,
  SeasonState,
  Settings,
  Team,
} from '../types';
import { createEmptyBracket } from '../config/bracketTopology';
import { propagateWinners, seedBracketFromTable } from '../lib/bracket';
import { computeStandings } from '../lib/standings';
import {
  HistoryEntry,
  SCHEMA_VERSION,
  loadHistory,
  loadState,
  pushHistory,
  saveState,
} from './persistence';

const DEFAULT_PROFILES: Profile[] = [
  { id: 'otec', name: 'Otec', avatarEmoji: '🧔' },
  { id: 'syn', name: 'Syn', avatarEmoji: '🧒' },
];

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  kidMode: false,
  soundOn: true,
  activeProfileId: 'otec',
  notificationsEnabled: false,
};

export function createInitialState(): SeasonState {
  return {
    schemaVersion: SCHEMA_VERSION,
    teams: teamsJson as Team[],
    fixtures: fixturesJson as Fixture[],
    fixturesAreDemo: false,
    ties: createEmptyBracket(),
    profiles: DEFAULT_PROFILES,
    predictions: [],
    seasonPredictions: [],
    earnedBadges: [],
    settings: DEFAULT_SETTINGS,
    updatedAt: new Date().toISOString(),
  };
}

/** Hypothetical winners for the "Čo ak…" mode. Never written to real data. */
export type WhatIf = Record<string, string | undefined>;

type SeasonStore = SeasonState & {
  hydrated: boolean;
  history: HistoryEntry[];
  whatIf: WhatIf;
  whatIfActive: boolean;

  hydrate: () => Promise<void>;

  // league phase
  setScore: (fixtureId: string, score: Score | undefined) => void;
  bumpScore: (fixtureId: string, side: 'home' | 'away', delta: number) => void;
  setFixtureStatus: (fixtureId: string, status: Fixture['status']) => void;
  replaceFixtures: (fixtures: Fixture[], isDemo: boolean) => void;
  clearFixtures: () => void;

  // chronicle
  patchFixture: (fixtureId: string, patch: Partial<Fixture>) => void;
  toggleWatched: (fixtureId: string) => void;
  setRating: (fixtureId: string, rating: Rating | undefined) => void;

  // knockout
  setTieTeams: (tieId: string, teamAId?: string, teamBId?: string) => void;
  setLegScore: (tieId: string, leg: 0 | 1, score: Score | undefined) => void;
  patchLeg: (tieId: string, leg: 0 | 1, patch: Partial<NonNullable<KnockoutTie['legs'][0]>>) => void;
  setExtraTime: (tieId: string, score: Score | undefined) => void;
  setPenalties: (tieId: string, score: Score | undefined) => void;
  seedBracket: () => void;
  resetBracket: () => void;

  // what-if
  setWhatIfWinner: (tieId: string, teamId: string | undefined) => void;
  setWhatIfActive: (active: boolean) => void;
  resetWhatIf: () => void;

  // profiles + predictions
  addProfile: (name: string, avatarEmoji: string) => void;
  updateProfile: (id: string, patch: Partial<Profile>) => void;
  removeProfile: (id: string) => void;
  setPrediction: (userId: string, fixtureId: string, home: number, away: number) => void;
  removePrediction: (userId: string, fixtureId: string) => void;
  setSeasonPrediction: (userId: string, patch: Partial<SeasonPrediction>) => void;
  sealSeasonPrediction: (userId: string) => void;

  // badges + settings
  awardBadges: (earned: EarnedBadge[]) => void;
  patchSettings: (patch: Partial<Settings>) => void;

  // data safety
  importState: (state: SeasonState) => void;
  restoreFromHistory: (savedAt: string) => void;
  refreshHistory: () => Promise<void>;
};

/** Snapshot of just the persisted part of the store. */
export function toSeasonState(s: SeasonState): SeasonState {
  return {
    schemaVersion: s.schemaVersion,
    teams: s.teams,
    fixtures: s.fixtures,
    fixturesAreDemo: s.fixturesAreDemo,
    ties: s.ties,
    profiles: s.profiles,
    predictions: s.predictions,
    seasonPredictions: s.seasonPredictions,
    earnedBadges: s.earnedBadges,
    settings: s.settings,
    updatedAt: s.updatedAt,
  };
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pendingHistoryLabel: string | undefined;
let pendingBefore: SeasonState | undefined;

export const useSeasonStore = create<SeasonStore>()((set, get) => {
  /**
   * Every mutation goes through here: it stamps updatedAt, schedules a
   * debounced write to IndexedDB and adds a history snapshot so any change can
   * be rolled back.
   *
   * Writes are debounced, so a burst of taps (+1 +1 +1 on a stepper) becomes a
   * single save and a single undo point. That point is the state from *before*
   * the first tap of the burst — undoing has to take back the whole burst, not
   * just the last goal.
   */
  const commit = (label: string, updater: (state: SeasonStore) => Partial<SeasonState>) => {
    pendingBefore = pendingBefore ?? toSeasonState(get());
    pendingHistoryLabel = pendingHistoryLabel ?? label;
    set((state) => ({ ...updater(state), updatedAt: new Date().toISOString() }));

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const snapshot = toSeasonState(get());
      void saveState(snapshot);
      const historyLabel = pendingHistoryLabel ?? label;
      const before = pendingBefore ?? snapshot;
      pendingHistoryLabel = undefined;
      pendingBefore = undefined;
      void pushHistory(before, historyLabel).then((history) => set({ history }));
    }, 400);
  };

  const mapFixture = (id: string, fn: (f: Fixture) => Fixture) => (state: SeasonStore) => ({
    fixtures: state.fixtures.map((f) => (f.id === id ? fn(f) : f)),
  });

  const mapTie = (id: string, fn: (t: KnockoutTie) => KnockoutTie) => (state: SeasonStore) => ({
    ties: propagateWinners(state.ties.map((t) => (t.id === id ? fn(t) : t))),
  });

  return {
    ...createInitialState(),
    hydrated: false,
    history: [],
    whatIf: {},
    whatIfActive: false,

    hydrate: async () => {
      const [stored, history] = await Promise.all([loadState(), loadHistory()]);
      set({ ...(stored ?? {}), history, hydrated: true });
    },

    // --- league phase -----------------------------------------------------
    setScore: (fixtureId, score) =>
      commit(
        'Zmena výsledku',
        mapFixture(fixtureId, (f) => ({
          ...f,
          score,
          status: score ? 'finished' : 'scheduled',
        })),
      ),

    bumpScore: (fixtureId, side, delta) =>
      commit(
        'Zmena výsledku',
        mapFixture(fixtureId, (f) => {
          const current = f.score ?? { home: 0, away: 0 };
          const next = {
            ...current,
            [side]: Math.max(0, Math.min(99, current[side] + delta)),
          } as Score;
          return { ...f, score: next, status: 'finished' };
        }),
      ),

    setFixtureStatus: (fixtureId, status) =>
      commit('Zmena stavu zápasu', mapFixture(fixtureId, (f) => ({ ...f, status }))),

    replaceFixtures: (fixtures, isDemo) =>
      commit('Import rozpisu', () => ({ fixtures, fixturesAreDemo: isDemo })),

    clearFixtures: () =>
      commit('Vymazanie rozpisu', () => ({ fixtures: [], fixturesAreDemo: false })),

    // --- chronicle --------------------------------------------------------
    patchFixture: (fixtureId, patch) =>
      commit('Zápis do kroniky', mapFixture(fixtureId, (f) => ({ ...f, ...patch }))),

    toggleWatched: (fixtureId) =>
      commit(
        'Pozerali sme spolu',
        mapFixture(fixtureId, (f) => ({ ...f, watchedTogether: !f.watchedTogether })),
      ),

    setRating: (fixtureId, rating) =>
      commit('Hodnotenie zápasu', mapFixture(fixtureId, (f) => ({ ...f, rating }))),

    // --- knockout ---------------------------------------------------------
    setTieTeams: (id, teamAId, teamBId) =>
      commit('Zmena tímov v dvojzápase', mapTie(id, (t) => ({ ...t, teamAId, teamBId }))),

    setLegScore: (id, leg, score) =>
      commit(
        'Výsledok dvojzápasu',
        mapTie(id, (t) => {
          const legs: KnockoutTie['legs'] = [t.legs[0], t.legs[1]];
          legs[leg] = { ...(legs[leg] ?? {}), score };
          return { ...t, legs };
        }),
      ),

    patchLeg: (id, leg, patch) =>
      commit(
        'Zápis do kroniky',
        mapTie(id, (t) => {
          const legs: KnockoutTie['legs'] = [t.legs[0], t.legs[1]];
          legs[leg] = { ...(legs[leg] ?? {}), ...patch };
          return { ...t, legs };
        }),
      ),

    setExtraTime: (id, score) =>
      commit('Predĺženie', mapTie(id, (t) => ({ ...t, extraTime: score }))),

    setPenalties: (id, score) =>
      commit('Penalty', mapTie(id, (t) => ({ ...t, penalties: score }))),

    seedBracket: () =>
      commit('Nasadenie pavúka podľa tabuľky', (state) => ({
        ties: seedBracketFromTable(state.ties, computeStandings(state.teams, state.fixtures)),
      })),

    resetBracket: () => commit('Vymazanie pavúka', () => ({ ties: createEmptyBracket() })),

    // --- what-if (never persisted into the season) ------------------------
    setWhatIfWinner: (tieId, teamId) =>
      set((state) => ({ whatIf: { ...state.whatIf, [tieId]: teamId }, whatIfActive: true })),
    setWhatIfActive: (whatIfActive) => set({ whatIfActive }),
    resetWhatIf: () => set({ whatIf: {}, whatIfActive: false }),

    // --- profiles + predictions -------------------------------------------
    addProfile: (name, avatarEmoji) =>
      commit('Nový profil', (state) => {
        const id = slug(name, state.profiles.map((p) => p.id));
        return { profiles: [...state.profiles, { id, name, avatarEmoji }] };
      }),

    updateProfile: (id, patch) =>
      commit('Úprava profilu', (state) => ({
        profiles: state.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      })),

    removeProfile: (id) =>
      commit('Zmazanie profilu', (state) => {
        const profiles = state.profiles.filter((p) => p.id !== id);
        return {
          profiles,
          predictions: state.predictions.filter((p) => p.userId !== id),
          seasonPredictions: state.seasonPredictions.filter((p) => p.userId !== id),
          earnedBadges: state.earnedBadges.filter((b) => b.userId !== id),
          settings:
            state.settings.activeProfileId === id
              ? { ...state.settings, activeProfileId: profiles[0]?.id ?? '' }
              : state.settings,
        };
      }),

    setPrediction: (userId, fixtureId, home, away) =>
      commit('Tip', (state) => {
        const existing = state.predictions.find(
          (p) => p.userId === userId && p.fixtureId === fixtureId,
        );
        const entry: Prediction = {
          userId,
          fixtureId,
          home,
          away,
          lockedAt: existing?.lockedAt ?? new Date().toISOString(),
        };
        return {
          predictions: existing
            ? state.predictions.map((p) => (p === existing ? entry : p))
            : [...state.predictions, entry],
        };
      }),

    removePrediction: (userId, fixtureId) =>
      commit('Zmazanie tipu', (state) => ({
        predictions: state.predictions.filter(
          (p) => !(p.userId === userId && p.fixtureId === fixtureId),
        ),
      })),

    setSeasonPrediction: (userId, patch) =>
      commit('Veľká predpoveď', (state) => {
        const existing = state.seasonPredictions.find((p) => p.userId === userId);
        const entry: SeasonPrediction = {
          userId,
          finalistIds: [undefined, undefined],
          ...existing,
          ...patch,
        };
        return {
          seasonPredictions: existing
            ? state.seasonPredictions.map((p) => (p.userId === userId ? entry : p))
            : [...state.seasonPredictions, entry],
        };
      }),

    sealSeasonPrediction: (userId) =>
      commit('Zapečatenie predpovede', (state) => ({
        seasonPredictions: state.seasonPredictions.map((p) =>
          p.userId === userId ? { ...p, sealedAt: new Date().toISOString() } : p,
        ),
      })),

    // --- badges + settings -------------------------------------------------
    awardBadges: (earned) => {
      if (!earned.length) return;
      // The badge check re-runs after every change and returns everything that
      // currently qualifies, so filter first: committing unconditionally would
      // save and push an undo point on every score entry, flooding the history
      // with "Nový odznak" and pushing out the real ones.
      const known = new Set(get().earnedBadges.map((b) => `${b.userId}|${b.badgeId}`));
      const fresh = earned.filter((b) => !known.has(`${b.userId}|${b.badgeId}`));
      if (!fresh.length) return;
      commit('Nový odznak', (state) => ({ earnedBadges: [...state.earnedBadges, ...fresh] }));
    },

    patchSettings: (patch) =>
      commit('Nastavenia', (state) => ({ settings: { ...state.settings, ...patch } })),

    // --- data safety --------------------------------------------------------
    importState: (state) => commit('Import zálohy', () => state),

    restoreFromHistory: (savedAt) =>
      commit('Návrat k predchádzajúcemu stavu', (state) => {
        const entry = state.history.find((h) => h.savedAt === savedAt);
        return entry ? entry.state : {};
      }),

    refreshHistory: async () => set({ history: await loadHistory() }),
  };
});

function slug(name: string, taken: string[]): string {
  const base =
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'profil';
  let candidate = base;
  let n = 2;
  while (taken.includes(candidate)) candidate = `${base}-${n++}`;
  return candidate;
}
