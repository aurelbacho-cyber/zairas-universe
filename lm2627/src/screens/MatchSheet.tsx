import { useRef } from 'react';
import type { Route } from '../App';
import { useSeasonStore } from '../store/useSeasonStore';
import { useTeamMap } from '../store/selectors';
import { Sheet } from '../components/Sheet';
import { Stars } from '../components/Stars';
import { ScoreStepper } from '../components/ScoreStepper';
import { TeamTile } from '../components/TeamTile';
import { formatKickoff } from '../components/FixtureRow';
import { readPhoto } from '../lib/photo';

/** Full detail of one league match: score, chronicle notes, photo. */
export function MatchSheet({
  fixtureId,
  onClose,
  onNavigate,
}: {
  fixtureId: string | null;
  onClose: () => void;
  onNavigate?: (r: Route) => void;
}) {
  const fixture = useSeasonStore((s) => s.fixtures.find((f) => f.id === fixtureId));
  const patchFixture = useSeasonStore((s) => s.patchFixture);
  const bumpScore = useSeasonStore((s) => s.bumpScore);
  const setScore = useSeasonStore((s) => s.setScore);
  const teams = useTeamMap();
  const photoInput = useRef<HTMLInputElement>(null);

  if (!fixture) return null;
  const home = teams.get(fixture.homeId);
  const away = teams.get(fixture.awayId);

  return (
    <Sheet open onClose={onClose} title={`${home?.name ?? ''} – ${away?.name ?? ''}`}>
      <p className="text-xs muted">
        {fixture.matchday}. kolo · {formatKickoff(fixture.date)}
      </p>

      <div className="mt-3 space-y-2">
        {(['home', 'away'] as const).map((side) => {
          const team = side === 'home' ? home : away;
          return (
            <div key={side} className="surface-2 flex items-center gap-2 rounded-xl p-2">
              <TeamTile team={team} />
              <span className="min-w-0 flex-1 truncate font-bold">{team?.name}</span>
              <span className="text-xs muted">{side === 'home' ? 'doma' : 'vonku'}</span>
              <ScoreStepper
                label={team?.name ?? side}
                value={fixture.score?.[side]}
                onChange={(next) => bumpScore(fixture.id, side, next - (fixture.score?.[side] ?? 0))}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-ghost text-sm"
          onClick={() => setScore(fixture.id, undefined)}
          disabled={!fixture.score}
        >
          Vymazať výsledok
        </button>
        {onNavigate && home ? (
          <button
            type="button"
            className="btn btn-ghost text-sm"
            onClick={() => {
              onClose();
              onNavigate({ name: 'team', teamId: home.id });
            }}
          >
            {home.short} →
          </button>
        ) : null}
        {onNavigate && away ? (
          <button
            type="button"
            className="btn btn-ghost text-sm"
            onClick={() => {
              onClose();
              onNavigate({ name: 'team', teamId: away.id });
            }}
          >
            {away.short} →
          </button>
        ) : null}
      </div>

      <hr className="my-4" style={{ borderColor: 'var(--app-border)' }} />

      <h3 className="font-black">📖 Do kroniky</h3>

      <label className="mt-2 flex items-center gap-3">
        <input
          type="checkbox"
          className="h-6 w-6"
          checked={fixture.watchedTogether}
          onChange={(e) => patchFixture(fixture.id, { watchedTogether: e.target.checked })}
        />
        <span className="font-bold">Pozerali sme spolu 👀</span>
      </label>

      <div className="mt-3">
        <span className="text-sm font-bold">Hodnotenie zápasu</span>
        <Stars value={fixture.rating} onChange={(rating) => patchFixture(fixture.id, { rating })} />
      </div>

      <label className="mt-3 block text-sm font-bold" htmlFor="moment">
        Moment zápasu
      </label>
      <input
        id="moment"
        className="input"
        placeholder="Napr. gól z polovice ihriska v 88. minúte"
        value={fixture.momentOfMatch ?? ''}
        onChange={(e) => patchFixture(fixture.id, { momentOfMatch: e.target.value })}
      />

      <label className="mt-3 block text-sm font-bold" htmlFor="note">
        Poznámka
      </label>
      <textarea
        id="note"
        className="input min-h-[5rem] py-2"
        placeholder="Čo si z toho zápasu zapamätáme?"
        value={fixture.note ?? ''}
        onChange={(e) => patchFixture(fixture.id, { note: e.target.value })}
      />

      <div className="mt-3">
        <span className="block text-sm font-bold">Fotka z pozerania</span>
        {fixture.photoDataUrl ? (
          <div className="mt-1 space-y-2">
            <img
              src={fixture.photoDataUrl}
              alt="Fotka zo zápasu"
              className="max-h-48 w-full rounded-xl object-cover"
            />
            <button
              type="button"
              className="btn btn-ghost text-sm"
              onClick={() => patchFixture(fixture.id, { photoDataUrl: undefined })}
            >
              Odstrániť fotku
            </button>
          </div>
        ) : (
          <button type="button" className="btn mt-1" onClick={() => photoInput.current?.click()}>
            📸 Pridať fotku
          </button>
        )}
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const dataUrl = await readPhoto(file);
            patchFixture(fixture.id, { photoDataUrl: dataUrl });
          }}
        />
      </div>
    </Sheet>
  );
}
