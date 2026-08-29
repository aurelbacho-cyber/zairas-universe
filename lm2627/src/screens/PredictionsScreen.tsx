import { useMemo, useState } from 'react';
import type { Route } from '../App';
import { useSeasonStore } from '../store/useSeasonStore';
import { useActiveProfile, useLeaderboard, usePredictionResults, useTeamMap } from '../store/selectors';
import { isMatchdayLocked, matchdayLockTime, matchdayPoints } from '../lib/scoring';
import { MATCHDAYS } from '../config/calendar';
import { SCORING } from '../config/rules';
import { EmptyState } from '../components/EmptyState';
import { ScoreStepper } from '../components/ScoreStepper';
import { TeamTile } from '../components/TeamTile';
import { SeasonPredictionCard } from './SeasonPredictionCard';
import { BadgeCabinet } from './BadgeCabinet';
import { formatKickoff } from '../components/FixtureRow';
import type { Matchday } from '../types';

type Tab = 'tips' | 'reveal' | 'table' | 'season' | 'badges';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'tips', label: 'Tipy' },
  { id: 'reveal', label: 'Vyhodnotenie' },
  { id: 'table', label: 'Rebríček' },
  { id: 'season', label: 'Predpoveď' },
  { id: 'badges', label: 'Odznaky' },
];

export function PredictionsScreen({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const fixtures = useSeasonStore((s) => s.fixtures);
  const [tab, setTab] = useState<Tab>('tips');
  const [matchday, setMatchday] = useState<Matchday>(() => nextOpenMatchday(fixtures));

  if (!fixtures.length) {
    return (
      <EmptyState
        emoji="🏆"
        title="Tipovačka čaká na rozpis"
        action={
          <button type="button" className="btn btn-primary" onClick={() => onNavigate({ name: 'import' })}>
            Naimportovať rozpis
          </button>
        }
      >
        Bez rozpisu zápasov sa nedá tipovať.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      <ProfileSwitcher onNavigate={onNavigate} />

      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Tipovačka">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className="tap shrink-0 rounded-xl px-3 text-sm font-black"
            style={{
              background: tab === t.id ? 'var(--app-accent)' : 'var(--app-surface)',
              color: tab === t.id ? '#04121f' : 'var(--app-text)',
              border: '1px solid var(--app-border)',
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tips' ? <TipsTab matchday={matchday} setMatchday={setMatchday} /> : null}
      {tab === 'reveal' ? <RevealTab matchday={matchday} setMatchday={setMatchday} /> : null}
      {tab === 'table' ? <LeaderboardTab /> : null}
      {tab === 'season' ? <SeasonPredictionCard /> : null}
      {tab === 'badges' ? <BadgeCabinet /> : null}
    </div>
  );
}

function ProfileSwitcher({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const profiles = useSeasonStore((s) => s.profiles);
  const activeId = useSeasonStore((s) => s.settings.activeProfileId);
  const patchSettings = useSeasonStore((s) => s.patchSettings);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs muted">Kto tipuje:</span>
      {profiles.map((p) => (
        <button
          key={p.id}
          type="button"
          className="chip tap"
          aria-pressed={p.id === activeId}
          style={p.id === activeId ? { borderColor: 'var(--app-accent)', color: 'var(--app-accent)' } : undefined}
          onClick={() => patchSettings({ activeProfileId: p.id })}
        >
          {p.avatarEmoji} {p.name}
        </button>
      ))}
      <button type="button" className="chip tap" onClick={() => onNavigate({ name: 'settings' })}>
        ＋
      </button>
    </div>
  );
}

function MatchdayPicker({
  matchday,
  setMatchday,
}: {
  matchday: Matchday;
  setMatchday: (m: Matchday) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {MATCHDAYS.map((m) => (
        <button
          key={m.matchday}
          type="button"
          className="tap shrink-0 rounded-xl px-3 font-black"
          aria-pressed={m.matchday === matchday}
          style={{
            background: m.matchday === matchday ? 'var(--app-surface-2)' : 'transparent',
            border: '1px solid var(--app-border)',
          }}
          onClick={() => setMatchday(m.matchday)}
        >
          {m.matchday}.
        </button>
      ))}
    </div>
  );
}

function TipsTab({
  matchday,
  setMatchday,
}: {
  matchday: Matchday;
  setMatchday: (m: Matchday) => void;
}) {
  const fixtures = useSeasonStore((s) => s.fixtures);
  const predictions = useSeasonStore((s) => s.predictions);
  const setPrediction = useSeasonStore((s) => s.setPrediction);
  const teams = useTeamMap();
  const profile = useActiveProfile();

  const list = useMemo(
    () => fixtures.filter((f) => f.matchday === matchday).sort((a, b) => a.date.localeCompare(b.date)),
    [fixtures, matchday],
  );
  const locked = isMatchdayLocked(fixtures, matchday);
  const lockTime = matchdayLockTime(fixtures, matchday);

  if (!profile) return <p className="muted">Najprv si vytvor profil v nastaveniach.</p>;

  return (
    <div className="space-y-2">
      <MatchdayPicker matchday={matchday} setMatchday={setMatchday} />

      <div className="card text-sm">
        <p className="font-black">
          {locked ? '🔒 Tipy sú zamknuté' : '✏️ Tipy sú otvorené'}
        </p>
        <p className="muted text-xs">
          {locked
            ? 'Kolo sa už začalo, tipy sa nedajú meniť.'
            : lockTime
              ? `Zamknú sa pri prvom výkope: ${lockTime.toLocaleString('sk-SK')}`
              : 'Kolo zatiaľ nemá dátumy.'}
        </p>
        <p className="muted mt-1 text-xs">
          Presný výsledok {SCORING.exact} b · správny víťaz {SCORING.outcome} b · bonus{' '}
          +{SCORING.upsetBonus} b za presný tip prekvapenia.
        </p>
      </div>

      <ul className="space-y-2">
        {list.map((fixture) => {
          const mine = predictions.find(
            (p) => p.userId === profile.id && p.fixtureId === fixture.id,
          );
          const home = teams.get(fixture.homeId);
          const away = teams.get(fixture.awayId);
          return (
            <li key={fixture.id} className="card">
              <p className="text-xs muted">{formatKickoff(fixture.date)}</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <TeamTile team={home} size="sm" />
                    <span className="truncate text-sm font-semibold">{home?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TeamTile team={away} size="sm" />
                    <span className="truncate text-sm font-semibold">{away?.name}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <ScoreStepper
                    label={`Tip ${home?.name ?? ''}`}
                    value={mine?.home}
                    compact
                    onChange={(next) =>
                      !locked && setPrediction(profile.id, fixture.id, next, mine?.away ?? 0)
                    }
                  />
                  <ScoreStepper
                    label={`Tip ${away?.name ?? ''}`}
                    value={mine?.away}
                    compact
                    onChange={(next) =>
                      !locked && setPrediction(profile.id, fixture.id, mine?.home ?? 0, next)
                    }
                  />
                </div>
              </div>
              {locked && !mine ? <p className="mt-1 text-xs muted">Bez tipu.</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Pack-opening reveal: points appear one match at a time. */
function RevealTab({
  matchday,
  setMatchday,
}: {
  matchday: Matchday;
  setMatchday: (m: Matchday) => void;
}) {
  const fixtures = useSeasonStore((s) => s.fixtures);
  const profiles = useSeasonStore((s) => s.profiles);
  const results = usePredictionResults();
  const teams = useTeamMap();
  const [revealed, setRevealed] = useState(0);

  const list = useMemo(
    () =>
      fixtures
        .filter((f) => f.matchday === matchday && f.status === 'finished')
        .sort((a, b) => a.date.localeCompare(b.date)),
    [fixtures, matchday],
  );

  const totals = matchdayPoints(results, fixtures, matchday);
  const shown = list.slice(0, revealed);
  const done = revealed >= list.length;

  return (
    <div className="space-y-2">
      <MatchdayPicker
        matchday={matchday}
        setMatchday={(m) => {
          setMatchday(m);
          setRevealed(0);
        }}
      />

      {!list.length ? (
        <p className="card text-sm muted">V tomto kole ešte nie sú zapísané žiadne výsledky.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={done}
              onClick={() => setRevealed((n) => Math.min(list.length, n + 1))}
            >
              {revealed === 0 ? '🎁 Otvoriť balíček' : `Ďalší zápas (${revealed}/${list.length})`}
            </button>
            <button type="button" className="btn" onClick={() => setRevealed(list.length)}>
              Odhaliť všetko
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setRevealed(0)}>
              ↺
            </button>
          </div>

          <ul className="space-y-2">
            {shown.map((fixture) => {
              const home = teams.get(fixture.homeId);
              const away = teams.get(fixture.awayId);
              return (
                <li key={fixture.id} className="card pop-in">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold">
                      {home?.short} – {away?.short}
                    </span>
                    <span className="font-black tabular-nums">
                      {fixture.score?.home}:{fixture.score?.away}
                    </span>
                  </div>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {profiles.map((p) => {
                      const r = results.find(
                        (x) => x.userId === p.id && x.fixtureId === fixture.id,
                      );
                      return (
                        <li key={p.id} className="flex items-center gap-2">
                          <span>{p.avatarEmoji}</span>
                          <span className="min-w-0 flex-1 truncate">{p.name}</span>
                          <span className="muted tabular-nums">
                            {r ? `${r.predicted.home}:${r.predicted.away}` : '—'}
                          </span>
                          <span
                            className="w-14 text-right font-black tabular-nums"
                            style={{ color: r && r.points > 0 ? '#4ade80' : 'var(--app-muted)' }}
                          >
                            {r ? `+${r.points}` : '0'}
                            {r?.upsetBonus ? ' 🔥' : ''}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>

          {done ? (
            <div className="card pop-in">
              <h3 className="font-black">Body za {matchday}. kolo</h3>
              <ul className="mt-1 space-y-1">
                {profiles
                  .slice()
                  .sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0))
                  .map((p, i) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <span className="text-lg">{['🥇', '🥈', '🥉'][i] ?? '▪️'}</span>
                      <span className="flex-1">
                        {p.avatarEmoji} {p.name}
                      </span>
                      <span className="font-black tabular-nums">{totals.get(p.id) ?? 0} b</span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function LeaderboardTab() {
  const rows = useLeaderboard();
  return (
    <div className="card">
      <h3 className="font-black">Rebríček sezóny</h3>
      <ul className="mt-2 space-y-2">
        {rows.map((row) => (
          <li key={row.profile.id} className="surface-2 flex items-center gap-3 rounded-xl p-2">
            <span className="text-2xl">{['🥇', '🥈', '🥉'][row.rank - 1] ?? `${row.rank}.`}</span>
            <span className="text-xl">{row.profile.avatarEmoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-black">{row.profile.name}</p>
              <p className="text-xs muted">
                {row.exact}× presne · {row.outcome}× víťaz · {row.upsets}× prekvapenie ·{' '}
                {row.predictions} tipov
              </p>
            </div>
            <span className="text-2xl font-black tabular-nums">{row.points}</span>
          </li>
        ))}
      </ul>
      {rows.every((r) => r.predictions === 0) ? (
        <p className="mt-2 text-sm muted">Zatiaľ nikto netipoval.</p>
      ) : null}
    </div>
  );
}

function nextOpenMatchday(fixtures: Array<{ matchday: Matchday }>): Matchday {
  const first = fixtures[0]?.matchday;
  return first ?? 1;
}
