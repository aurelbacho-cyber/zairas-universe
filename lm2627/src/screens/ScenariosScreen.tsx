import { useEffect, useMemo, useRef, useState } from 'react';
import type { Route } from '../App';
import { useSeasonStore } from '../store/useSeasonStore';
import { useActiveProfile, useStandings, useTeamMap } from '../store/selectors';
import { ProbabilityBar } from '../components/ProbabilityBar';
import { TeamTile } from '../components/TeamTile';
import { EmptyState } from '../components/EmptyState';
import { SIMULATION_RUNS } from '../config/simulation';
import type { SimulationResponse, SimulationRow } from '../workers/simulate.worker';

export function ScenariosScreen({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const teams = useSeasonStore((s) => s.teams);
  const fixtures = useSeasonStore((s) => s.fixtures);
  const teamMap = useTeamMap();
  const table = useStandings();
  const profile = useActiveProfile();

  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | undefined>(profile?.favouriteTeamId);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const run = () => {
    setRunning(true);
    setError(null);
    workerRef.current?.terminate();
    const worker = new Worker(new URL('../workers/simulate.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<{ ok: boolean; result?: SimulationResponse; error?: string }>) => {
      setRunning(false);
      if (e.data.ok && e.data.result) setResult(e.data.result);
      else setError(e.data.error ?? 'Simulácia zlyhala.');
      worker.terminate();
      workerRef.current = null;
    };
    worker.onerror = (e) => {
      setRunning(false);
      setError(e.message || 'Simuláciu sa nepodarilo spustiť.');
    };
    worker.postMessage({ teams, fixtures, runs: SIMULATION_RUNS });
  };

  const focus: SimulationRow | undefined = useMemo(
    () => result?.rows.find((r) => r.teamId === focusId),
    [result, focusId],
  );

  if (!fixtures.length) {
    return (
      <EmptyState
        emoji="📈"
        title="Bez rozpisu sa nedá počítať"
        action={
          <button type="button" className="btn btn-primary" onClick={() => onNavigate({ name: 'import' })}>
            Naimportovať rozpis
          </button>
        }
      >
        Kalkulačka potrebuje vedieť, ktoré zápasy ešte len prídu.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      <button type="button" className="btn btn-ghost text-sm" onClick={() => onNavigate({ name: 'table' })}>
        ← Späť
      </button>

      <div className="card">
        <h2 className="text-lg font-black">📈 Čo sa musí stať?</h2>
        <p className="text-sm muted">
          Aplikácia odohrá zvyšok ligovej fázy {SIMULATION_RUNS.toLocaleString('sk-SK')}× a
          spočíta, ako často ktorý tím skončí do 8., do 24. miesta alebo vypadne. Sila tímov
          vychádza z koša a doterajších výsledkov — je to <strong>odhad</strong>, nie veštba.
        </p>
        <button type="button" className="btn btn-primary mt-2" onClick={run} disabled={running}>
          {running ? 'Počítam…' : '🎲 Spustiť simuláciu'}
        </button>
      </div>

      {error ? (
        <p className="card text-sm" style={{ borderColor: '#b91c1c', color: '#fca5a5' }}>
          {error}
        </p>
      ) : null}

      {result ? (
        <>
          <div className="card space-y-2">
            <label className="block text-sm font-bold">
              Môj tím
              <select
                className="input mt-1"
                value={focusId ?? ''}
                onChange={(e) => setFocusId(e.target.value || undefined)}
              >
                <option value="">— vyber tím —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            {focus ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <TeamTile team={teamMap.get(focus.teamId)} size="lg" />
                  <div>
                    <p className="font-black">{teamMap.get(focus.teamId)?.name}</p>
                    <p className="text-xs muted">
                      Priemerne {focus.averagePoints.toFixed(1)} bodov, {focus.averageRank.toFixed(1)}.
                      miesto
                    </p>
                  </div>
                </div>
                <ProbabilityBar label="Do top 8" value={focus.top8} color="#22c55e" />
                <ProbabilityBar label="Do top 24" value={focus.top24} color="#eab308" />
                <ProbabilityBar label="Vypadnutie" value={focus.eliminated} color="#94a3b8" />
                <p className="text-sm">
                  {kidSummary(teamMap.get(focus.teamId)?.name ?? '', focus)}
                </p>
              </div>
            ) : null}
          </div>

          <div className="card">
            <h3 className="font-black">Všetky tímy</h3>
            <p className="text-xs muted">
              Zostáva {result.remainingMatches} zápasov · {result.runs.toLocaleString('sk-SK')} simulácií
            </p>
            <ul className="mt-2 space-y-1">
              {result.rows.map((row) => {
                const team = teamMap.get(row.teamId);
                const rank = table.find((r) => r.teamId === row.teamId)?.rank;
                return (
                  <li key={row.teamId} className="surface-2 flex items-center gap-2 rounded-xl p-2">
                    <span className="w-6 text-xs muted tabular-nums">{rank}.</span>
                    <TeamTile team={team} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm">{team?.name}</span>
                    <span className="w-12 text-right text-xs tabular-nums" style={{ color: '#22c55e' }}>
                      {Math.round(row.top8 * 100)} %
                    </span>
                    <span className="w-12 text-right text-xs tabular-nums" style={{ color: '#eab308' }}>
                      {Math.round(row.top24 * 100)} %
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs muted">
              Zelená = šanca na top 8 · žltá = šanca na postup do play-off (top 24).
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** One plain sentence a child can read. */
function kidSummary(name: string, row: SimulationRow): string {
  const pct = Math.round(row.top24 * 100);
  if (pct >= 95) return `${name} má postup takmer istý — ${pct} % šancu, že postúpi ďalej. 🎉`;
  if (pct >= 60) return `${name} to má dobre rozohrané: ${pct} % šancu na postup. 💪`;
  if (pct >= 30) return `${name} má ${pct} % šancu na postup — ešte sa dá všetko. 🤞`;
  if (pct >= 5) return `${name} to má ťažké, ale ${pct} % šanca stále je. 🙏`;
  return `${name} má už len ${pct} % šancu. Ale futbal vie prekvapiť! ⚽`;
}
