import { describe, expect, it } from 'vitest';
import teamsJson from '../data/teams.json';
import type { Fixture, Team } from '../types';
import { generateDemoSchedule } from './demoSchedule';
import { validateFixtures } from './validateFixtures';

const teams = teamsJson as Team[];

/** A known-good schedule the individual cases then break in one specific way. */
function goodSchedule(): Fixture[] {
  const result = generateDemoSchedule(teams);
  if (!result.ok) throw new Error(result.error);
  return result.fixtures;
}

const codes = (fixtures: Fixture[]) =>
  validateFixtures(fixtures, teams)
    .issues.filter((i) => i.level === 'error')
    .map((i) => i.code);

describe('validateFixtures', () => {
  it('accepts a complete, rule-compliant schedule', () => {
    const report = validateFixtures(goodSchedule(), teams);
    expect(report.ok).toBe(true);
    expect(report.counts.fixtures).toBe(144);
    expect(report.counts.teamsSeen).toBe(36);
  });

  it('rejects 143 matches', () => {
    const broken = goodSchedule().slice(0, 143);
    expect(codes(broken)).toContain('total-count');
  });

  it('rejects a team with five home matches', () => {
    const fixtures = goodSchedule();
    // Flip one of a team's away matches so it ends up 5 home / 3 away.
    const target = fixtures.find((f) => f.awayId === 'slovan')!;
    const swapped = fixtures.map((f) =>
      f.id === target.id ? { ...f, homeId: target.awayId, awayId: target.homeId } : f,
    );
    const found = codes(swapped);
    expect(found).toContain('team-home-count');
    expect(found).toContain('team-away-count');
  });

  it('rejects a repeated opponent', () => {
    const fixtures = goodSchedule();
    const first = fixtures.find((f) => f.homeId === 'slovan')!;
    const second = fixtures.find((f) => f.homeId === 'slovan' && f.id !== first.id)!;
    // Make Slovan play the same opponent twice.
    const broken = fixtures.map((f) =>
      f.id === second.id ? { ...f, awayId: first.awayId } : f,
    );
    expect(codes(broken)).toContain('team-duplicate-opponent');
  });

  it('rejects a wrong pot spread', () => {
    const fixtures = goodSchedule();
    // Replace a pot-4 opponent of Slovan with a different pot-1 team.
    const target = fixtures.find(
      (f) => f.homeId === 'slovan' && teams.find((t) => t.id === f.awayId)?.pot === 4,
    );
    expect(target).toBeDefined();
    const broken = fixtures.map((f) => (f.id === target!.id ? { ...f, awayId: 'psg' } : f));
    expect(codes(broken)).toContain('team-pot-spread');
  });

  it('rejects an unknown team and a self-match', () => {
    const fixtures = goodSchedule();
    const broken = fixtures.map((f, i) =>
      i === 0 ? { ...f, awayId: 'kdeaka' } : i === 1 ? { ...f, awayId: f.homeId } : f,
    );
    const found = codes(broken);
    expect(found).toContain('unknown-team');
    expect(found).toContain('self-match');
  });

  it('warns, but does not fail, on a date outside the published window', () => {
    const fixtures = goodSchedule();
    const moved = fixtures.map((f, i) =>
      i === 0 ? { ...f, date: '2026-07-01T19:00:00.000Z' } : f,
    );
    const report = validateFixtures(moved, teams);
    expect(report.ok).toBe(true);
    expect(report.issues.map((i) => i.code)).toContain('date-outside-window');
  });
});
