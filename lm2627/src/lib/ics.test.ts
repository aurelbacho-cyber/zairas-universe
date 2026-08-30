import { describe, expect, it } from 'vitest';
import { calendarSkeletonIcs, fixturesToIcs } from './ics';
import { fixture, team } from './testUtils';
import type { Team } from '../types';

const teams: Team[] = [team('psg', 1, { name: 'Paríž Saint-Germain' }), team('slovan', 4, { name: 'ŠK Slovan Bratislava' })];
const fixtures = [
  fixture('m1', 'psg', 'slovan', undefined, 1, '2026-09-08T19:00:00.000Z'),
  fixture('m2', 'slovan', 'psg', undefined, 2, '2026-10-13T19:00:00.000Z'),
];

const lines = (ics: string) => ics.split('\r\n');

describe('fixturesToIcs', () => {
  it('writes a well-formed calendar', () => {
    const ics = fixturesToIcs(fixtures, teams);
    const l = lines(ics);
    expect(l[0]).toBe('BEGIN:VCALENDAR');
    expect(l[l.length - 1]).toBe('END:VCALENDAR');
    expect(l.filter((x) => x === 'BEGIN:VEVENT')).toHaveLength(2);
    expect(l.filter((x) => x === 'END:VEVENT')).toHaveLength(2);
    expect(ics).toContain('DTSTART:20260908T190000Z');
  });

  it('filters down to one team when asked', () => {
    const ics = fixturesToIcs(
      [...fixtures, fixture('m3', 'psg', 'psg', undefined, 3, '2026-10-20T19:00:00.000Z')],
      teams,
      'slovan',
    );
    expect(lines(ics).filter((x) => x === 'BEGIN:VEVENT')).toHaveLength(2);
  });

  it('skips matches with no usable date instead of writing a broken event', () => {
    const ics = fixturesToIcs([{ ...fixtures[0], date: 'niekedy' }], teams);
    expect(lines(ics).filter((x) => x === 'BEGIN:VEVENT')).toHaveLength(0);
  });

  it('escapes separators in names', () => {
    const odd: Team[] = [team('x', 1, { name: 'Tím, s čiarkou' }), team('y', 2, { name: 'Iný; tím' })];
    const ics = fixturesToIcs([fixture('m', 'x', 'y', undefined, 1, '2026-09-08T19:00:00.000Z')], odd);
    expect(ics).toContain('Tím\\, s čiarkou');
    expect(ics).toContain('Iný\\; tím');
  });

  it('keeps every line within the 75-octet limit', () => {
    const long: Team[] = [
      team('x', 1, { name: 'A'.repeat(90) }),
      team('y', 2, { name: 'B'.repeat(90) }),
    ];
    const ics = fixturesToIcs([fixture('m', 'x', 'y', undefined, 1, '2026-09-08T19:00:00.000Z')], long);
    for (const line of lines(ics)) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
    // A folded line continues with a single leading space.
    expect(ics).toMatch(/\r\n /);
  });
});

describe('calendarSkeletonIcs', () => {
  it('covers all eight matchdays and the knockout rounds', () => {
    const ics = calendarSkeletonIcs();
    const events = lines(ics).filter((x) => x === 'BEGIN:VEVENT').length;
    // 8 matchdays + 2 legs each for PO/R16/QF/SF + the final
    expect(events).toBe(8 + 4 * 2 + 1);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260908');
    expect(ics).toContain('Estadio Metropolitano');
  });
});
