import type { Fixture, Team } from '../types';
import { MATCHDAYS, KNOCKOUT_ROUNDS, ROUND_LABELS } from '../config/calendar';

/**
 * Minimal RFC 5545 writer — enough for Google/Apple Calendar to import.
 * Every match becomes a 2-hour event.
 */
export function buildIcs(
  events: Array<{ uid: string; start: Date; end?: Date; summary: string; description?: string; allDay?: boolean }>,
  calendarName = 'Liga majstrov 26/27',
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pavuk LM 26/27//SK',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const e of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.uid}`);
    lines.push(`DTSTAMP:${stamp(new Date())}`);
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${dateOnly(e.start)}`);
      lines.push(`DTEND;VALUE=DATE:${dateOnly(new Date(e.start.getTime() + 86_400_000))}`);
    } else {
      lines.push(`DTSTART:${stamp(e.start)}`);
      lines.push(`DTEND:${stamp(e.end ?? new Date(e.start.getTime() + 2 * 3_600_000))}`);
    }
    lines.push(`SUMMARY:${escapeText(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n');
}

/** Matches of one team, or the whole competition when teamId is undefined. */
export function fixturesToIcs(
  fixtures: Fixture[],
  teams: Team[],
  teamId?: string,
): string {
  const name = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
  const relevant = teamId
    ? fixtures.filter((f) => f.homeId === teamId || f.awayId === teamId)
    : fixtures;

  const events = relevant
    .filter((f) => f.date && !Number.isNaN(Date.parse(f.date)))
    .map((f) => ({
      uid: `${f.id}@pavuk-lm-2627`,
      start: new Date(f.date),
      summary: `${name(f.homeId)} – ${name(f.awayId)}`,
      description: `Liga majstrov 26/27, ${f.matchday}. kolo`,
    }));

  return buildIcs(events, teamId ? `LM 26/27 — ${name(teamId)}` : 'Liga majstrov 26/27');
}

/** All-day markers for the eight matchdays and the knockout rounds. */
export function calendarSkeletonIcs(): string {
  const events = [
    ...MATCHDAYS.map((m) => ({
      uid: `md-${m.matchday}@pavuk-lm-2627`,
      start: new Date(`${m.from}T00:00:00Z`),
      summary: `LM 26/27 — ${m.matchday}. kolo`,
      description: m.label,
      allDay: true,
    })),
    ...KNOCKOUT_ROUNDS.flatMap((r) =>
      r.legs.filter(Boolean).map((leg, i) => ({
        uid: `${r.round}-leg${i + 1}@pavuk-lm-2627`,
        start: new Date(`${leg!.from}T00:00:00Z`),
        summary: `LM 26/27 — ${ROUND_LABELS[r.round]}${r.legs.length > 1 ? `, ${i + 1}. zápas` : ''}`,
        description: r.venue ?? '',
        allDay: true,
      })),
    ),
  ];
  return buildIcs(events);
}

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const dateOnly = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;

const escapeText = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/** iCalendar lines must not exceed 75 octets. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join('\r\n');
}
