import type { Fixture, Team } from '../types';
import { NOTIFY_MINUTES_BEFORE } from '../config/rules';

/**
 * Reminders for the favourite team's matches, scheduled with setTimeout while
 * the app is open. There is no backend and no push server, so this only fires
 * for matches starting within the browser's timer range — good enough for
 * "the app is on the tablet and the match is this evening".
 */
let timers: Array<ReturnType<typeof setTimeout>> = [];

export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export function clearScheduled(): void {
  timers.forEach(clearTimeout);
  timers = [];
}

export function scheduleReminders(
  fixtures: Fixture[],
  teams: Team[],
  favouriteTeamId: string | undefined,
): number {
  clearScheduled();
  if (!favouriteTeamId || !('Notification' in window) || Notification.permission !== 'granted') {
    return 0;
  }

  const name = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
  const now = Date.now();
  // setTimeout is only reliable up to ~24 days; anything further is re-armed
  // the next time the app is opened.
  const horizon = 20 * 86_400_000;
  let scheduled = 0;

  for (const f of fixtures) {
    if (f.homeId !== favouriteTeamId && f.awayId !== favouriteTeamId) continue;
    const kickoff = Date.parse(f.date);
    if (Number.isNaN(kickoff)) continue;
    const fireAt = kickoff - NOTIFY_MINUTES_BEFORE * 60_000;
    const delay = fireAt - now;
    if (delay <= 0 || delay > horizon) continue;

    timers.push(
      setTimeout(() => {
        new Notification('Onedlho sa začína zápas ⚽', {
          body: `${name(f.homeId)} – ${name(f.awayId)} o ${NOTIFY_MINUTES_BEFORE} minút.`,
          tag: f.id,
        });
      }, delay),
    );
    scheduled++;
  }
  return scheduled;
}
