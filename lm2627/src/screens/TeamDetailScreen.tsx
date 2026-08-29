import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Route } from '../App';
import { useSeasonStore } from '../store/useSeasonStore';
import { useStandings, useTeamMap } from '../store/selectors';
import { positionHistory, teamFixtures } from '../lib/standings';
import { TeamTile } from '../components/TeamTile';
import { bandOf } from './TableScreen';
import { MatchSheet } from './MatchSheet';
import { formatKickoff } from '../components/FixtureRow';
import { fixturesToIcs } from '../lib/ics';
import { downloadText } from '../lib/backup';

export function TeamDetailScreen({
  teamId,
  onNavigate,
}: {
  teamId: string;
  onNavigate: (r: Route) => void;
}) {
  const teams = useSeasonStore((s) => s.teams);
  const fixtures = useSeasonStore((s) => s.fixtures);
  const patchSettings = useSeasonStore((s) => s.patchSettings);
  const updateProfile = useSeasonStore((s) => s.updateProfile);
  const activeProfileId = useSeasonStore((s) => s.settings.activeProfileId);
  const profiles = useSeasonStore((s) => s.profiles);
  const teamMap = useTeamMap();
  const table = useStandings();
  const [openId, setOpenId] = useState<string | null>(null);

  const team = teamMap.get(teamId);
  const row = table.find((r) => r.teamId === teamId);
  const matches = useMemo(() => teamFixtures(teamId, fixtures), [teamId, fixtures]);

  const chart = useMemo(() => {
    const history = positionHistory(teams, fixtures);
    return history.map((h) => ({ kolo: h.matchday, miesto: h.positions[teamId], body: h.points[teamId] }));
  }, [teams, fixtures, teamId]);

  const isFavourite = profiles.find((p) => p.id === activeProfileId)?.favouriteTeamId === teamId;

  if (!team) {
    return <p className="muted">Tím sa nenašiel.</p>;
  }

  const band = row ? bandOf(row.rank) : undefined;

  return (
    <div className="space-y-3">
      <button type="button" className="btn btn-ghost text-sm" onClick={() => onNavigate({ name: 'table' })}>
        ← Späť na tabuľku
      </button>

      <div className="card flex items-center gap-3">
        <TeamTile team={team} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-black">{team.name}</h2>
          <p className="text-xs muted">
            {team.country} · kôš {team.pot}
            {row ? ` · ${row.rank}. miesto` : ''}
          </p>
        </div>
        <button
          type="button"
          className="btn text-sm"
          aria-pressed={isFavourite}
          style={isFavourite ? { borderColor: 'var(--app-accent)' } : undefined}
          onClick={() => {
            updateProfile(activeProfileId, { favouriteTeamId: isFavourite ? undefined : teamId });
            patchSettings({});
          }}
        >
          {isFavourite ? '💙 Môj tím' : '🤍 Označiť'}
        </button>
      </div>

      {row ? (
        <div className="card grid grid-cols-4 gap-2 text-center">
          <Stat label="Body" value={row.points} />
          <Stat label="Z–V–R–P" value={`${row.played}-${row.won}-${row.drawn}-${row.lost}`} small />
          <Stat label="Skóre" value={`${row.goalsFor}:${row.goalsAgainst}`} small />
          <Stat label="Forma" value={row.form.slice(0, 5).join('') || '–'} small />
          {band ? (
            <p className="col-span-4 text-xs" style={{ color: band.color }}>
              ● {band.label}
            </p>
          ) : null}
        </div>
      ) : null}

      {chart.length > 1 ? (
        <div className="card">
          <h3 className="mb-1 font-black">Vývoj pozície</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" />
                <XAxis dataKey="kolo" stroke="var(--app-muted)" fontSize={11} />
                <YAxis reversed domain={[1, 36]} stroke="var(--app-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--app-surface)',
                    border: '1px solid var(--app-border)',
                    borderRadius: 12,
                    color: 'var(--app-text)',
                  }}
                  formatter={(value: number, key: string) => [value, key === 'miesto' ? 'Miesto' : 'Body']}
                  labelFormatter={(v) => `${v}. kolo`}
                />
                <Line
                  type="monotone"
                  dataKey="miesto"
                  stroke={team.colors.primary}
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-black">Zápasy ({matches.length})</h3>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() =>
              downloadText(`${team.id}-lm2627.ics`, fixturesToIcs(fixtures, teams, teamId), 'text/calendar')
            }
          >
            📅 Do kalendára
          </button>
        </div>
        <ul className="space-y-1">
          {matches.map((f) => {
            const opponentId = f.homeId === teamId ? f.awayId : f.homeId;
            const opponent = teamMap.get(opponentId);
            const home = f.homeId === teamId;
            const gf = f.score ? (home ? f.score.home : f.score.away) : undefined;
            const ga = f.score ? (home ? f.score.away : f.score.home) : undefined;
            const outcome = gf === undefined || ga === undefined ? '' : gf > ga ? 'W' : gf < ga ? 'L' : 'D';
            return (
              <li key={f.id}>
                <button
                  type="button"
                  className="surface-2 flex w-full items-center gap-2 rounded-xl p-2 text-left"
                  onClick={() => setOpenId(f.id)}
                >
                  <span className="w-6 text-xs muted">{f.matchday}.</span>
                  <TeamTile team={opponent} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {home ? '' : 'u '}
                    {opponent?.name ?? opponentId}
                  </span>
                  {outcome ? (
                    <span
                      className="rounded px-1.5 text-xs font-black"
                      style={{
                        background:
                          outcome === 'W' ? '#166534' : outcome === 'L' ? '#7f1d1d' : '#374151',
                      }}
                    >
                      {gf}:{ga}
                    </span>
                  ) : (
                    <span className="text-xs muted">{formatKickoff(f.date)}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <MatchSheet fixtureId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div>
      <div className={small ? 'text-sm font-black' : 'text-2xl font-black'}>{value}</div>
      <div className="text-[11px] muted">{label}</div>
    </div>
  );
}
