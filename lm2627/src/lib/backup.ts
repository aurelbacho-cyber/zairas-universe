import type { KnockoutTie, SeasonState } from '../types';
import { SCHEMA_VERSION } from '../store/persistence';
import { nextTie } from '../config/bracketTopology';

export type BackupFile = {
  app: 'pavuk-lm-2627';
  schemaVersion: number;
  exportedAt: string;
  state: SeasonState;
};

export function buildBackup(state: SeasonState): BackupFile {
  return {
    app: 'pavuk-lm-2627',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };
}

export type ParsedBackup = { ok: true; state: SeasonState } | { ok: false; error: string };

/** Accepts a full backup file, or a bare state object from an older export. */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Neplatný JSON: ${(e as Error).message}` };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Súbor neobsahuje objekt.' };

  const obj = raw as Record<string, unknown>;
  const state = (obj.state ?? obj) as SeasonState;

  for (const key of ['teams', 'fixtures', 'ties', 'profiles'] as const) {
    if (!Array.isArray(state[key])) {
      return { ok: false, error: `V zálohe chýba pole „${key}".` };
    }
  }
  if (typeof state.settings !== 'object' || state.settings === null) {
    return { ok: false, error: 'V zálohe chýbajú nastavenia.' };
  }

  return {
    ok: true,
    state: {
      ...state,
      schemaVersion: SCHEMA_VERSION,
      ties: normaliseTies(state.ties),
      predictions: state.predictions ?? [],
      seasonPredictions: state.seasonPredictions ?? [],
      earnedBadges: state.earnedBadges ?? [],
      fixturesAreDemo: state.fixturesAreDemo ?? false,
      updatedAt: state.updatedAt ?? new Date().toISOString(),
    },
  };
}

/**
 * JSON has no `undefined`: an empty leg comes back as `null` and keys that were
 * undefined vanish entirely. Restore both so an imported bracket behaves
 * exactly like one that never left the app.
 */
function normaliseTies(ties: KnockoutTie[]): KnockoutTie[] {
  return ties.map((tie) => {
    const next = nextTie(tie.round, tie.slot);
    return {
      ...tie,
      legs: [tie.legs?.[0] ?? undefined, tie.legs?.[1] ?? undefined],
      feedsInto: tie.feedsInto ?? next?.id,
      feedsSide: tie.feedsSide ?? next?.side,
    };
  });
}

/** Triggers a browser download of a text file. */
export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const backupFilename = () =>
  `pavuk-lm-2627-${new Date().toISOString().slice(0, 10)}.json`;
