import { useMemo, useState } from 'react';
import type { Route } from '../App';
import { useSeasonStore } from '../store/useSeasonStore';
import { useActiveProfile, useTeamMap } from '../store/selectors';
import { MATCHDAYS, MATCHDAY_8_NOTE } from '../config/calendar';
import { FixtureRow } from '../components/FixtureRow';
import { EmptyState } from '../components/EmptyState';
import { MatchSheet } from './MatchSheet';
import { playGoalSound } from '../components/Confetti';
import type { Matchday } from '../types';

export function MatchdaysScreen({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const fixtures = useSeasonStore((s) => s.fixtures);
  const bumpScore = useSeasonStore((s) => s.bumpScore);
  const soundOn = useSeasonStore((s) => s.settings.soundOn);
  const kidMode = useSeasonStore((s) => s.settings.kidMode);
  const teams = useTeamMap();
  const profile = useActiveProfile();

  const [matchday, setMatchday] = useState<Matchday>(() => firstUnplayed(fixtures));
  const [openId, setOpenId] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);

  const list = useMemo(() => {
    const all = fixtures
      .filter((f) => f.matchday === matchday)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    if (!onlyMine || !profile?.favouriteTeamId) return all;
    return all.filter(
      (f) => f.homeId === profile.favouriteTeamId || f.awayId === profile.favouriteTeamId,
    );
  }, [fixtures, matchday, onlyMine, profile]);

  const window = MATCHDAYS.find((m) => m.matchday === matchday);
  const played = list.filter((f) => f.status === 'finished').length;

  if (!fixtures.length) {
    return (
      <EmptyState
        emoji="📥"
        title="Zatiaľ tu nie je žiadny rozpis"
        action={
          <button type="button" className="btn btn-primary" onClick={() => onNavigate({ name: 'import' })}>
            Naimportovať rozpis
          </button>
        }
      >
        Naimportuj rozpis 144 zápasov z uefa.com, alebo si vygeneruj ukážkový a appku si
        vyskúšaj.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Hracie kolá">
        {MATCHDAYS.map((m) => {
          const active = m.matchday === matchday;
          const count = fixtures.filter((f) => f.matchday === m.matchday).length;
          return (
            <button
              key={m.matchday}
              type="button"
              role="tab"
              aria-selected={active}
              className="tap shrink-0 rounded-xl px-4 font-black"
              style={{
                background: active ? 'var(--app-accent)' : 'var(--app-surface)',
                color: active ? '#04121f' : 'var(--app-text)',
                border: '1px solid var(--app-border)',
                opacity: count ? 1 : 0.5,
              }}
              onClick={() => setMatchday(m.matchday)}
            >
              {m.matchday}.
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h2 className="text-lg font-black">{matchday}. kolo</h2>
          <p className="text-xs muted">
            {window?.label}
            {matchday === 8 ? ` · ${MATCHDAY_8_NOTE}` : ''} · zapísaných {played}/{list.length}
          </p>
        </div>
        {profile?.favouriteTeamId ? (
          <button
            type="button"
            className="chip ml-auto"
            aria-pressed={onlyMine}
            style={onlyMine ? { borderColor: 'var(--app-accent)' } : undefined}
            onClick={() => setOnlyMine((v) => !v)}
          >
            💙 Iba môj tím
          </button>
        ) : null}
      </div>

      {list.length ? (
        <ul className="space-y-2">
          {list.map((fixture) => (
            <FixtureRow
              key={fixture.id}
              fixture={fixture}
              teams={teams}
              highlightTeamId={profile?.favouriteTeamId}
              onOpen={() => setOpenId(fixture.id)}
              onBump={(side, delta) => {
                bumpScore(fixture.id, side, delta);
                const scorerId = side === 'home' ? fixture.homeId : fixture.awayId;
                if (delta > 0 && soundOn && kidMode && scorerId === profile?.favouriteTeamId) {
                  playGoalSound();
                }
              }}
            />
          ))}
        </ul>
      ) : (
        <p className="muted text-sm">V tomto kole nie sú žiadne zápasy.</p>
      )}

      <MatchSheet fixtureId={openId} onClose={() => setOpenId(null)} onNavigate={onNavigate} />
    </div>
  );
}

/** Opens on the first matchday that still has unplayed matches. */
function firstUnplayed(fixtures: Array<{ matchday: Matchday; status: string }>): Matchday {
  for (let md = 1; md <= 8; md++) {
    const inRound = fixtures.filter((f) => f.matchday === md);
    if (inRound.length && inRound.some((f) => f.status !== 'finished')) return md as Matchday;
  }
  return 1;
}
