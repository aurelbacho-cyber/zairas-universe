import type { Fixture, Team } from '../types';
import { TeamTile } from './TeamTile';
import { ScoreStepper } from './ScoreStepper';

export function formatKickoff(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleString('sk-SK', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * One match in a matchday list. The score steppers are the primary control:
 * two taps during a match and the result is in.
 */
export function FixtureRow({
  fixture,
  teams,
  onBump,
  onOpen,
  highlightTeamId,
}: {
  fixture: Fixture;
  teams: Map<string, Team>;
  onBump: (side: 'home' | 'away', delta: number) => void;
  onOpen: () => void;
  highlightTeamId?: string;
}) {
  const home = teams.get(fixture.homeId);
  const away = teams.get(fixture.awayId);
  const involved = highlightTeamId === fixture.homeId || highlightTeamId === fixture.awayId;

  return (
    <li
      className="card"
      style={involved ? { borderColor: 'var(--app-accent)' } : undefined}
    >
      <div className="flex items-center justify-between gap-2 text-xs muted">
        <span>{formatKickoff(fixture.date)}</span>
        <span className="flex items-center gap-2">
          {fixture.watchedTogether ? <span title="Pozerali sme spolu">👀</span> : null}
          {fixture.rating ? <span>{'⭐'.repeat(fixture.rating)}</span> : null}
          <button type="button" className="btn btn-ghost h-7 min-h-0 px-2 text-xs" onClick={onOpen}>
            Detail
          </button>
        </span>
      </div>

      <div className="mt-1 grid grid-cols-[1fr_auto] items-center gap-2">
        <div className="min-w-0 space-y-1">
          <TeamLine team={home} bold={fixture.homeId === highlightTeamId} />
          <TeamLine team={away} bold={fixture.awayId === highlightTeamId} />
        </div>
        <div className="flex flex-col gap-1">
          <ScoreStepper
            label={`${home?.name ?? 'domáci'} doma`}
            value={fixture.score?.home}
            onChange={(next) => onBump('home', next - (fixture.score?.home ?? 0))}
            compact
          />
          <ScoreStepper
            label={`${away?.name ?? 'hostia'} vonku`}
            value={fixture.score?.away}
            onChange={(next) => onBump('away', next - (fixture.score?.away ?? 0))}
            compact
          />
        </div>
      </div>
    </li>
  );
}

function TeamLine({ team, bold }: { team?: Team; bold?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <TeamTile team={team} size="sm" />
      <span className={`truncate ${bold ? 'font-black' : 'font-semibold'}`}>
        {team?.name ?? '—'}
      </span>
    </div>
  );
}
