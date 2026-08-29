import { describe, expect, it } from 'vitest';
import { parseFixtures, resolveTeamId } from './importParsers';
import { team } from './testUtils';
import type { Team } from '../types';

const teams: Team[] = [
  team('psg', 1, { name: 'Paríž Saint-Germain', short: 'PSG' }),
  team('slovan', 4, { name: 'ŠK Slovan Bratislava', short: 'SLO' }),
];

describe('parseFixtures', () => {
  it('reads a JSON array', () => {
    const result = parseFixtures(
      '[{"matchday":1,"date":"2026-09-08T19:00:00Z","homeId":"psg","awayId":"slovan"}]',
      teams,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fixtures[0].homeId).toBe('psg');
    expect(result.fixtures[0].date).toBe('2026-09-08T19:00:00.000Z');
    expect(result.fixtures[0].status).toBe('scheduled');
  });

  it('reads an object wrapping a fixtures array', () => {
    const result = parseFixtures(
      '{"fixtures":[{"matchday":2,"date":"2026-10-13T19:00:00Z","home":"PSG","away":"SLO"}]}',
      teams,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fixtures[0].awayId).toBe('slovan');
  });

  it('reads CSV with a header, including scores', () => {
    const result = parseFixtures(
      'matchday,date,homeId,awayId,homeScore,awayScore\n1,2026-09-08T19:00:00Z,psg,slovan,3,1',
      teams,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.format).toBe('csv');
    expect(result.fixtures[0].score).toEqual({ home: 3, away: 1 });
    expect(result.fixtures[0].status).toBe('finished');
  });

  it('reports an unknown team rather than silently dropping it', () => {
    const result = parseFixtures(
      '[{"matchday":1,"date":"2026-09-08T19:00:00Z","homeId":"psg","awayId":"nikto"}]',
      teams,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('nikto');
  });

  it('reports a missing CSV column', () => {
    const result = parseFixtures('kolo,domaci\n1,psg', teams);
    expect(result.ok).toBe(false);
  });
});

describe('resolveTeamId', () => {
  it('matches on id, short code, and full name', () => {
    expect(resolveTeamId('psg', teams)).toBe('psg');
    expect(resolveTeamId('SLO', teams)).toBe('slovan');
    expect(resolveTeamId('ŠK Slovan Bratislava', teams)).toBe('slovan');
  });

  it('matches a name typed without diacritics', () => {
    expect(resolveTeamId('SK Slovan Bratislava', teams)).toBe('slovan');
    expect(resolveTeamId('Pariz Saint-Germain', teams)).toBe('psg');
  });

  it('returns undefined for an unknown name', () => {
    expect(resolveTeamId('Žilina', teams)).toBeUndefined();
  });
});
