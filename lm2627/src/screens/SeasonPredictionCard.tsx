import { useSeasonStore } from '../store/useSeasonStore';
import { useActiveProfile, useRealTies, useStandings, useTeamMap } from '../store/selectors';
import { FINAL_DATE } from '../config/calendar';
import { TeamTile } from '../components/TeamTile';

/**
 * "Veľká predpoveď sezóny": filled in once in September, sealed, and only
 * opened on the day of the final.
 */
export function SeasonPredictionCard() {
  const profiles = useSeasonStore((s) => s.profiles);
  const seasonPredictions = useSeasonStore((s) => s.seasonPredictions);
  const setSeasonPrediction = useSeasonStore((s) => s.setSeasonPrediction);
  const seal = useSeasonStore((s) => s.sealSeasonPrediction);
  const teams = useSeasonStore((s) => s.teams);
  const teamMap = useTeamMap();
  const table = useStandings();
  const ties = useRealTies();
  const profile = useActiveProfile();

  const unsealed = isUnsealDay();
  const mine = seasonPredictions.find((p) => p.userId === profile?.id);
  const sealed = !!mine?.sealedAt;

  const final = ties.find((t) => t.round === 'F');
  const actualWinner = final?.winnerId;
  const actualFinalists = [final?.teamAId, final?.teamBId].filter(Boolean) as string[];
  const actualLast = table.length === 36 && table[35].played > 0 ? table[35].teamId : undefined;

  if (!profile) return <p className="muted">Najprv si vytvor profil.</p>;

  return (
    <div className="space-y-3">
      <div className="card">
        <h3 className="font-black">🔮 Veľká predpoveď sezóny</h3>
        <p className="text-sm muted">
          Vyplň raz, zapečať a otvor až vo finále{' '}
          {new Date(`${FINAL_DATE}T12:00:00Z`).toLocaleDateString('sk-SK')}.
        </p>
      </div>

      {sealed && !unsealed ? (
        <div className="card text-center">
          <p className="text-6xl" aria-hidden="true">
            ✉️
          </p>
          <p className="mt-2 font-black">Obálka je zapečatená</p>
          <p className="text-sm muted">
            Zapečatené {new Date(mine!.sealedAt!).toLocaleDateString('sk-SK')}. Otvorí sa v deň
            finále.
          </p>
        </div>
      ) : (
        <div className="card space-y-3">
          <PickRow
            label="Víťaz Ligy majstrov"
            value={mine?.winnerId}
            teams={teams}
            disabled={sealed}
            onChange={(winnerId) => setSeasonPrediction(profile.id, { winnerId })}
            correct={unsealed && !!actualWinner && mine?.winnerId === actualWinner}
            actual={unsealed ? teamMap.get(actualWinner ?? '')?.name : undefined}
          />
          {[0, 1].map((i) => (
            <PickRow
              key={i}
              label={`${i + 1}. finalista`}
              value={mine?.finalistIds?.[i]}
              teams={teams}
              disabled={sealed}
              onChange={(id) => {
                const finalists: [string?, string?] = [
                  mine?.finalistIds?.[0],
                  mine?.finalistIds?.[1],
                ];
                finalists[i] = id;
                setSeasonPrediction(profile.id, { finalistIds: finalists });
              }}
              correct={
                unsealed && !!mine?.finalistIds?.[i] && actualFinalists.includes(mine.finalistIds[i]!)
              }
              actual={unsealed ? actualFinalists.map((id) => teamMap.get(id)?.name).join(' a ') : undefined}
            />
          ))}
          <label className="block text-sm font-bold">
            Najlepší strelec
            <input
              className="input mt-1"
              placeholder="Meno hráča"
              disabled={sealed}
              value={mine?.topScorer ?? ''}
              onChange={(e) => setSeasonPrediction(profile.id, { topScorer: e.target.value })}
            />
          </label>
          <PickRow
            label="Tím, ktorý skončí posledný"
            value={mine?.lastPlaceId}
            teams={teams}
            disabled={sealed}
            onChange={(lastPlaceId) => setSeasonPrediction(profile.id, { lastPlaceId })}
            correct={unsealed && !!actualLast && mine?.lastPlaceId === actualLast}
            actual={unsealed ? teamMap.get(actualLast ?? '')?.name : undefined}
          />

          {!sealed ? (
            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={!mine?.winnerId}
              onClick={() => {
                if (confirm('Zapečatiť predpoveď? Už sa nebude dať zmeniť.')) seal(profile.id);
              }}
            >
              ✉️ Zapečatiť obálku
            </button>
          ) : null}
        </div>
      )}

      {unsealed ? (
        <div className="card">
          <h3 className="font-black">🎉 Slávnostné odhalenie</h3>
          <ul className="mt-2 space-y-2">
            {profiles.map((p) => {
              const pred = seasonPredictions.find((sp) => sp.userId === p.id);
              const hits = [
                pred?.winnerId && pred.winnerId === actualWinner ? 'víťaza' : null,
                pred?.finalistIds?.some((id) => id && actualFinalists.includes(id))
                  ? 'finalistu'
                  : null,
                pred?.lastPlaceId && pred.lastPlaceId === actualLast ? 'posledné miesto' : null,
              ].filter(Boolean);
              return (
                <li key={p.id} className="surface-2 rounded-xl p-2 text-sm">
                  <p className="font-black">
                    {p.avatarEmoji} {p.name}
                  </p>
                  <p className="muted">
                    Víťaz: {teamMap.get(pred?.winnerId ?? '')?.name ?? '—'} · Strelec:{' '}
                    {pred?.topScorer || '—'}
                  </p>
                  <p style={{ color: hits.length ? '#4ade80' : 'var(--app-muted)' }}>
                    {hits.length ? `Trafil ${hits.join(', ')}!` : 'Tentokrát nič.'}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function PickRow({
  label,
  value,
  teams,
  disabled,
  onChange,
  correct,
  actual,
}: {
  label: string;
  value?: string;
  teams: import('../types').Team[];
  disabled: boolean;
  onChange: (id: string | undefined) => void;
  correct?: boolean;
  actual?: string;
}) {
  const team = teams.find((t) => t.id === value);
  return (
    <label className="block text-sm font-bold">
      {label}
      <span className="mt-1 flex items-center gap-2">
        <TeamTile team={team} size="sm" />
        <select
          className="input"
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">— vyber tím —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </span>
      {actual ? (
        <span className="mt-1 block text-xs" style={{ color: correct ? '#4ade80' : '#fca5a5' }}>
          {correct ? '✅ Trafené!' : `Skutočnosť: ${actual || '—'}`}
        </span>
      ) : null}
    </label>
  );
}

/** The envelope opens on the day of the final and stays open afterwards. */
function isUnsealDay(now: Date = new Date()): boolean {
  return now.toISOString().slice(0, 10) >= FINAL_DATE;
}
