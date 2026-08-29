import { get, set, del } from 'idb-keyval';
import type { SeasonState } from '../types';
import { HISTORY_SIZE } from '../config/rules';

const STATE_KEY = 'lm2627:season';
const HISTORY_KEY = 'lm2627:history';

export const SCHEMA_VERSION = 1;

export type HistoryEntry = { savedAt: string; label: string; state: SeasonState };

/**
 * IndexedDB, not localStorage: a whole season of notes and photos is far more
 * than localStorage is willing to hold, and it has to survive.
 */
export async function loadState(): Promise<SeasonState | undefined> {
  try {
    const raw = await get<SeasonState>(STATE_KEY);
    return raw ? migrate(raw) : undefined;
  } catch (e) {
    console.error('Nepodarilo sa načítať uložené dáta:', e);
    return undefined;
  }
}

export async function saveState(state: SeasonState): Promise<void> {
  await set(STATE_KEY, state);
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    return (await get<HistoryEntry[]>(HISTORY_KEY)) ?? [];
  } catch {
    return [];
  }
}

/** Keeps the last HISTORY_SIZE states so a mis-tap can always be undone. */
export async function pushHistory(state: SeasonState, label: string): Promise<HistoryEntry[]> {
  const history = await loadHistory();
  const next = [{ savedAt: new Date().toISOString(), label, state }, ...history].slice(0, HISTORY_SIZE);
  await set(HISTORY_KEY, next);
  return next;
}

export async function clearAll(): Promise<void> {
  await del(STATE_KEY);
  await del(HISTORY_KEY);
}

/** Upgrades an older saved state to the current schema. */
export function migrate(state: SeasonState): SeasonState {
  if (state.schemaVersion === SCHEMA_VERSION) return state;
  // No breaking changes yet; stamp the current version and carry on.
  return { ...state, schemaVersion: SCHEMA_VERSION };
}
