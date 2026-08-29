import type { Fixture, Matchday, Team } from '../types';

export type ParseResult =
  | { ok: true; fixtures: Fixture[]; format: 'json' | 'csv' }
  | { ok: false; error: string };

/** Accepts either a JSON array/object or a CSV table and returns fixtures. */
export function parseFixtures(input: string, teams: Team[]): ParseResult {
  const text = input.trim();
  if (!text) return { ok: false, error: 'Vstup je prázdny.' };
  if (text.startsWith('[') || text.startsWith('{')) return parseJson(text, teams);
  return parseCsv(text, teams);
}

function parseJson(text: string, teams: Team[]): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Neplatný JSON: ${(e as Error).message}` };
  }
  // Accept a bare array, or an object with a `fixtures` / `matches` key.
  let list: unknown = raw;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    list = obj.fixtures ?? obj.matches ?? obj.zapasy;
  }
  if (!Array.isArray(list)) {
    return { ok: false, error: 'JSON musí byť pole zápasov (alebo objekt s kľúčom "fixtures").' };
  }

  const fixtures: Fixture[] = [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i] as Record<string, unknown>;
    if (!row || typeof row !== 'object') {
      return { ok: false, error: `Položka ${i + 1} nie je objekt.` };
    }
    const built = buildFixture(
      {
        id: str(row.id),
        matchday: num(row.matchday ?? row.round ?? row.kolo),
        date: str(row.date ?? row.utcDate ?? row.datum),
        homeId: str(row.homeId ?? row.home ?? row.domaci),
        awayId: str(row.awayId ?? row.away ?? row.hostia),
        homeScore: numOrUndefined(row.homeScore),
        awayScore: numOrUndefined(row.awayScore),
      },
      teams,
    );
    if ('error' in built) return { ok: false, error: built.error };
    fixtures.push(built.fixture);
  }
  return { ok: true, fixtures, format: 'json' };
}

function parseCsv(text: string, teams: Team[]): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { ok: false, error: 'CSV musí mať hlavičku a aspoň jeden riadok.' };

  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const header = splitCsvLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());

  const col = (...names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };
  const iMd = col('matchday', 'kolo', 'round');
  const iDate = col('date', 'datum', 'dátum');
  const iHome = col('homeid', 'home', 'domaci', 'domáci');
  const iAway = col('awayid', 'away', 'hostia', 'hostujuci');
  const iId = col('id');
  const iHs = col('homescore', 'goly_domaci');
  const iAs = col('awayscore', 'goly_hostia');

  if (iMd < 0 || iDate < 0 || iHome < 0 || iAway < 0) {
    return {
      ok: false,
      error: 'CSV hlavička musí obsahovať stĺpce: matchday, date, homeId, awayId.',
    };
  }

  const fixtures: Fixture[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], delimiter);
    const built = buildFixture(
      {
        id: iId >= 0 ? cells[iId]?.trim() : undefined,
        matchday: Number(cells[iMd]),
        date: cells[iDate]?.trim(),
        homeId: cells[iHome]?.trim(),
        awayId: cells[iAway]?.trim(),
        homeScore: iHs >= 0 ? numOrUndefined(cells[iHs]) : undefined,
        awayScore: iAs >= 0 ? numOrUndefined(cells[iAs]) : undefined,
      },
      teams,
    );
    if ('error' in built) return { ok: false, error: `Riadok ${i + 1}: ${built.error}` };
    fixtures.push(built.fixture);
  }
  return { ok: true, fixtures, format: 'csv' };
}

type RawFixture = {
  id?: string;
  matchday: number;
  date?: string;
  homeId?: string;
  awayId?: string;
  homeScore?: number;
  awayScore?: number;
};

function buildFixture(
  raw: RawFixture,
  teams: Team[],
): { fixture: Fixture } | { error: string } {
  if (!raw.homeId || !raw.awayId) return { error: 'chýba domáci alebo hosťujúci tím.' };
  if (!Number.isInteger(raw.matchday)) return { error: 'chýba alebo je neplatné kolo.' };

  const homeId = resolveTeamId(raw.homeId, teams);
  const awayId = resolveTeamId(raw.awayId, teams);
  if (!homeId) return { error: `neznámy tím „${raw.homeId}".` };
  if (!awayId) return { error: `neznámy tím „${raw.awayId}".` };

  const date = normaliseDate(raw.date);
  const hasScore = raw.homeScore !== undefined && raw.awayScore !== undefined;

  return {
    fixture: {
      id: raw.id?.trim() || `md${raw.matchday}-${homeId}-${awayId}`,
      matchday: raw.matchday as Matchday,
      date,
      homeId,
      awayId,
      status: hasScore ? 'finished' : 'scheduled',
      score: hasScore ? { home: raw.homeScore!, away: raw.awayScore! } : undefined,
      watchedTogether: false,
    },
  };
}

/** Matches on id, short code, or name — so a hand-made CSV is forgiving. */
export function resolveTeamId(value: string, teams: Team[]): string | undefined {
  const v = value.trim();
  const lower = v.toLowerCase();
  const normalised = stripDiacritics(lower);
  const found =
    teams.find((t) => t.id === lower) ??
    teams.find((t) => t.short.toLowerCase() === lower) ??
    teams.find((t) => t.name.toLowerCase() === lower) ??
    teams.find((t) => stripDiacritics(t.name.toLowerCase()) === normalised);
  return found?.id;
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normaliseDate(value: string | undefined): string {
  if (!value) return '';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toISOString();
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const num = (v: unknown): number => Number(v);
const numOrUndefined = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
