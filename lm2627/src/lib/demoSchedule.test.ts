import { describe, expect, it } from 'vitest';
import teamsJson from '../data/teams.json';
import type { Team } from '../types';
import { generateDemoSchedule } from './demoSchedule';
import { validateFixtures } from './validateFixtures';

const teams = teamsJson as Team[];

describe('demo schedule generator', () => {
  it('produces a schedule that passes the real validator', () => {
    const result = generateDemoSchedule(teams);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const report = validateFixtures(result.fixtures, teams);
    const errors = report.issues.filter((i) => i.level === 'error');
    expect(errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(result.fixtures).toHaveLength(144);
  });

  it('is deterministic for the same seed', () => {
    const a = generateDemoSchedule(teams, 5);
    const b = generateDemoSchedule(teams, 5);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.fixtures.map((f) => f.id)).toEqual(b.fixtures.map((f) => f.id));
  });
});
