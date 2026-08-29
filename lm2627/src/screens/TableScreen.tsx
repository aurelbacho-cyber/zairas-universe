import { useMemo, useState } from 'react';
import type { Route } from '../App';
import { useSeasonStore } from '../store/useSeasonStore';
import { useActiveProfile, useStandings, useTeamMap } from '../store/selectors';
import { BANDS, tiebreakers } from '../config/rules';
import { TeamTile } from '../components/TeamTile';
import { EmptyState } from '../components/EmptyState';
import type { StandingRow } from '../types';

type Filter = 'all' | 'neighbours' | 'svk-cze';

/** 1–8 green, 9–24 yellow, 25–36 grey. */
export function bandOf(rank: number): { color: string; label: string } {
  if (rank <= BANDS.directR16.to) return { color: '#22c55e', label: 'Priamo do osemfinále' };
  if (rank <= BANDS.playoff.to) return { color: '#eab308', label: 'Play-off o osemfinále' };
  return { color: '#64748b', label: 'Koniec v Európe' };
}

export function TableScreen({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const table = useStandings();
  const fixtures = useSeasonStore((s) => s.fixtures);
  const teams = useTeamMap();
  const profile = useActiveProfile();
  const [filter, setFilter] = useState<Filter>('all');

  const favourite = profile?.favouriteTeamId;

  const rows = useMemo(() => {
    if (filter === 'neighbours' && favourite) {
      const index = table.findIndex((r) => r.teamId === favourite);
      if (index < 0) return table;
      return table.slice(Math.max(0, index - 3), index + 4);
    }
    if (filter === 'svk-cze') {
      return table.filter((r) => {
        const country = teams.get(r.teamId)?.country;
        return country === 'SVK' || country === 'CZE';
      });
    }
    return table;
  }, [table, filter, favourite, teams]);

  if (!fixtures.length) {
    return (
      <EmptyState
        emoji="📊"
        title="Tabuľka je zatiaľ prázdna"
        action={
          <button type="button" className="btn btn-primary" onClick={() => onNavigate({ name: 'import' })}>
            Naimportovať rozpis
          </button>
        }
      >
        Tabuľka sa naplní, keď bude rozpis a prvé výsledky.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          Všetkých 36
        </FilterChip>
        <FilterChip
          active={filter === 'neighbours'}
          disabled={!favourite}
          onClick={() => setFilter('neighbours')}
        >
          Môj tím a susedia
        </FilterChip>
        <FilterChip active={filter === 'svk-cze'} onClick={() => setFilter('svk-cze')}>
          🇸🇰 🇨🇿
        </FilterChip>
      </div>

      <Legend />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Tabuľka ligovej fázy Ligy majstrov 2026/27</caption>
          <thead>
            <tr className="muted text-xs">
              <th scope="col" className="p-1 text-left">#</th>
              <th scope="col" className="p-1 text-left">Tím</th>
              <th scope="col" className="p-1" title="Odohrané">Z</th>
              <th scope="col" className="p-1" title="Výhry">V</th>
              <th scope="col" className="p-1" title="Remízy">R</th>
              <th scope="col" className="p-1" title="Prehry">P</th>
              <th scope="col" className="p-1" title="Skóre">Skóre</th>
              <th scope="col" className="p-1" title="Gólový rozdiel">+/−</th>
              <th scope="col" className="p-1">B</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row
                key={row.teamId}
                row={row}
                name={teams.get(row.teamId)?.name ?? row.teamId}
                short={teams.get(row.teamId)?.short ?? ''}
                team={teams.get(row.teamId)}
                highlighted={row.teamId === favourite}
                onClick={() => onNavigate({ name: 'team', teamId: row.teamId })}
              />
            ))}
          </tbody>
        </table>
      </div>

      <details className="card text-sm">
        <summary className="cursor-pointer font-black">Ako sa rozhoduje pri rovnosti bodov</summary>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 muted">
          {tiebreakers.map((tb) => (
            <li key={tb.id}>{tb.label}</li>
          ))}
        </ol>
        <p className="mt-2 muted">
          Presné poradie treba overiť v aktuálnom reglemente UEFA — mení sa na jednom mieste
          v <code>src/config/rules.ts</code>.
        </p>
      </details>
    </div>
  );
}

function Row({
  row,
  name,
  short,
  team,
  highlighted,
  onClick,
}: {
  row: StandingRow;
  name: string;
  short: string;
  team?: import('../types').Team;
  highlighted: boolean;
  onClick: () => void;
}) {
  const band = bandOf(row.rank);
  return (
    <tr
      className="cursor-pointer border-b"
      style={{
        borderColor: 'var(--app-border)',
        background: highlighted ? 'var(--app-surface-2)' : undefined,
      }}
      onClick={onClick}
    >
      <td className="p-1">
        <span className="flex items-center gap-1">
          <span
            aria-hidden="true"
            className="inline-block h-4 w-1 rounded-full"
            style={{ background: band.color }}
          />
          <span className="tabular-nums font-bold">{row.rank}</span>
        </span>
      </td>
      <th scope="row" className="p-1 text-left font-semibold">
        <button type="button" className="flex items-center gap-2 text-left" onClick={onClick}>
          <TeamTile team={team} size="sm" />
          <span className="hidden sm:inline">{name}</span>
          <span className="sm:hidden">{short}</span>
          <span className="sr-only">{band.label}</span>
        </button>
      </th>
      <td className="p-1 text-center tabular-nums">{row.played}</td>
      <td className="p-1 text-center tabular-nums">{row.won}</td>
      <td className="p-1 text-center tabular-nums">{row.drawn}</td>
      <td className="p-1 text-center tabular-nums">{row.lost}</td>
      <td className="p-1 text-center tabular-nums whitespace-nowrap">
        {row.goalsFor}:{row.goalsAgainst}
      </td>
      <td className="p-1 text-center tabular-nums">
        {row.goalDiff > 0 ? '+' : ''}
        {row.goalDiff}
      </td>
      <td className="p-1 text-center font-black tabular-nums">{row.points}</td>
    </tr>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-3 text-xs muted">
      {[
        { color: '#22c55e', text: '1.–8. priamo do osemfinále' },
        { color: '#eab308', text: '9.–24. play-off' },
        { color: '#64748b', text: '25.–36. koniec' },
      ].map((item) => (
        <li key={item.text} className="flex items-center gap-1">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: item.color }}
          />
          {item.text}
        </li>
      ))}
    </ul>
  );
}

function FilterChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="chip tap"
      aria-pressed={active}
      disabled={disabled}
      style={{
        borderColor: active ? 'var(--app-accent)' : 'var(--app-border)',
        opacity: disabled ? 0.4 : 1,
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
