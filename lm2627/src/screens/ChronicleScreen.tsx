import { useMemo, useState } from 'react';
import type { Route } from '../App';
import { useSeasonStore } from '../store/useSeasonStore';
import { useSeasonSnapshot, useTeamMap } from '../store/selectors';
import { buildChronicleHtml, chronicleStats } from '../lib/chronicle';
import { downloadText } from '../lib/backup';
import { EmptyState } from '../components/EmptyState';
import { Stars } from '../components/Stars';
import { MatchSheet } from './MatchSheet';
import { formatKickoff } from '../components/FixtureRow';
import { TeamTile } from '../components/TeamTile';

type Filter = 'watched' | 'rated' | 'notes' | 'all';

export function ChronicleScreen({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const fixtures = useSeasonStore((s) => s.fixtures);
  const state = useSeasonSnapshot();
  const teams = useTeamMap();
  const [filter, setFilter] = useState<Filter>('watched');
  const [openId, setOpenId] = useState<string | null>(null);

  const stats = useMemo(() => chronicleStats(fixtures), [fixtures]);

  const list = useMemo(() => {
    const base = fixtures.slice().sort((a, b) => a.matchday - b.matchday || a.date.localeCompare(b.date));
    switch (filter) {
      case 'watched':
        return base.filter((f) => f.watchedTogether);
      case 'rated':
        return base.filter((f) => f.rating).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      case 'notes':
        return base.filter((f) => (f.note ?? '').trim() || (f.momentOfMatch ?? '').trim());
      default:
        return base;
    }
  }, [fixtures, filter]);

  if (!fixtures.length) {
    return (
      <EmptyState
        emoji="📖"
        title="Kronika sa začne písať s prvým zápasom"
        action={
          <button type="button" className="btn btn-primary" onClick={() => onNavigate({ name: 'import' })}>
            Naimportovať rozpis
          </button>
        }
      >
        Pri každom zápase označíš „pozerali sme spolu", dáš hviezdičky a napíšeš, čo si
        zapamätáte.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      <div className="card grid grid-cols-4 gap-2 text-center">
        <Stat value={stats.watchedTogether} label="spolu" />
        <Stat value={stats.totalWithScore} label="zapísaných" />
        <Stat value={stats.goals} label="gólov" />
        <Stat value={stats.photos} label="fotiek" />
      </div>

      <button
        type="button"
        className="btn btn-primary w-full"
        onClick={() => {
          const html = buildChronicleHtml(state);
          downloadText('kronika-lm-2627.html', html, 'text/html');
        }}
      >
        📖 Vygenerovať kroniku
      </button>
      <p className="text-xs muted">
        Stiahne sa jeden HTML súbor so všetkým — poznámkami, fotkami, tabuľkou aj pavúkom.
        Otvor ho v prehliadači a cez „Tlačiť → Uložiť ako PDF" z neho máš pamiatku na roky.
      </p>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['watched', '👀 Spolu'],
            ['rated', '⭐ Hodnotené'],
            ['notes', '📝 S poznámkou'],
            ['all', 'Všetky'],
          ] as Array<[Filter, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="chip tap"
            aria-pressed={filter === id}
            style={filter === id ? { borderColor: 'var(--app-accent)' } : undefined}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length ? (
        <ul className="space-y-2">
          {list.map((f) => {
            const home = teams.get(f.homeId);
            const away = teams.get(f.awayId);
            return (
              <li key={f.id}>
                <button
                  type="button"
                  className="card w-full text-left"
                  onClick={() => setOpenId(f.id)}
                >
                  <div className="flex items-center gap-2">
                    <TeamTile team={home} size="sm" />
                    <TeamTile team={away} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">
                      {home?.name} – {away?.name}
                    </span>
                    {f.score ? (
                      <span className="font-black tabular-nums">
                        {f.score.home}:{f.score.away}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs muted">
                    {f.matchday}. kolo · {formatKickoff(f.date)}
                    {f.watchedTogether ? ' · 👀 spolu' : ''}
                  </p>
                  {f.rating ? (
                    <div className="mt-1">
                      <Stars value={f.rating} readOnly />
                    </div>
                  ) : null}
                  {f.momentOfMatch ? (
                    <p className="mt-1 text-sm italic" style={{ color: '#fbbf24' }}>
                      „{f.momentOfMatch}"
                    </p>
                  ) : null}
                  {f.note ? <p className="mt-1 text-sm">{f.note}</p> : null}
                  {f.photoDataUrl ? (
                    <img
                      src={f.photoDataUrl}
                      alt=""
                      className="mt-2 max-h-40 w-full rounded-xl object-cover"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="card text-sm muted">
          Zatiaľ tu nič nie je. Otvor zápas v „Kolá", zaškrtni „pozerali sme spolu" a napíš
          poznámku.
        </p>
      )}

      <MatchSheet fixtureId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="text-[11px] muted">{label}</div>
    </div>
  );
}
