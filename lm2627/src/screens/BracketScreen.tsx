import { useMemo, useState } from 'react';
import { useSeasonStore } from '../store/useSeasonStore';
import { useActiveProfile, useDisplayTies, useStandings, useTeamMap } from '../store/selectors';
import { BracketSvg } from '../components/BracketSvg';
import { TieSheet } from './TieSheet';
import { teamPath, resolveTie } from '../lib/bracket';
import { ROUND_LABELS, DRAWS } from '../config/calendar';
import { TeamTile } from '../components/TeamTile';

export function BracketScreen() {
  const { ties, hypothetical } = useDisplayTies();
  const storedTies = useSeasonStore((s) => s.ties);
  const seedBracket = useSeasonStore((s) => s.seedBracket);
  const resetBracket = useSeasonStore((s) => s.resetBracket);
  const whatIfActive = useSeasonStore((s) => s.whatIfActive);
  const setWhatIfActive = useSeasonStore((s) => s.setWhatIfActive);
  const resetWhatIf = useSeasonStore((s) => s.resetWhatIf);
  const whatIf = useSeasonStore((s) => s.whatIf);
  const teams = useTeamMap();
  const table = useStandings();
  const profile = useActiveProfile();

  const [openTieId, setOpenTieId] = useState<string | null>(null);

  const favourite = profile?.favouriteTeamId;
  const path = useMemo(() => teamPath(ties, favourite), [ties, favourite]);
  const openTie = ties.find((t) => t.id === openTieId) ?? null;
  // The editor always writes to the real tie, never to the overlay.
  const storedTie = storedTies.find((t) => t.id === openTieId) ?? null;
  const editing = openTie && storedTie ? { ...storedTie, teamAId: storedTie.teamAId ?? openTie.teamAId, teamBId: storedTie.teamBId ?? openTie.teamBId } : null;

  const filled = ties.filter((t) => t.teamAId || t.teamBId).length;
  const champion = ties.find((t) => t.round === 'F')?.winnerId;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-black">Pavúk</h2>
        <button
          type="button"
          className="chip tap ml-auto"
          aria-pressed={whatIfActive}
          style={whatIfActive ? { borderColor: 'var(--app-accent)', color: 'var(--app-accent)' } : undefined}
          onClick={() => setWhatIfActive(!whatIfActive)}
        >
          🔮 Čo ak…
        </button>
        {whatIfActive && Object.keys(whatIf).length ? (
          <button type="button" className="chip tap" onClick={resetWhatIf}>
            ↺ Zresetovať
          </button>
        ) : null}
      </div>

      {whatIfActive ? (
        <p className="card text-xs" style={{ borderColor: 'var(--app-accent)' }}>
          Hráš sa s hypotézami. Klikni na dvojzápas a vyber, kto by postúpil — skutočné dáta
          zostanú nedotknuté. Prerušovaný rámik = hypotéza.
        </p>
      ) : null}

      {champion ? (
        <p className="card text-center text-lg font-black" style={{ borderColor: '#eab308' }}>
          🏆 Víťaz Ligy majstrov 2026/27: {teams.get(champion)?.name}
        </p>
      ) : null}

      <BracketSvg
        ties={ties}
        teams={teams}
        onSelect={setOpenTieId}
        highlightPath={path}
        hypothetical={hypothetical}
        favouriteTeamId={favourite}
      />

      {filled === 0 ? (
        <div className="card space-y-2">
          <h3 className="font-black">Pavúk je zatiaľ prázdny</h3>
          <p className="text-sm muted">
            Žreb play-off je koncom januára 2027, žreb celej vetvy pavúka{' '}
            {new Date(`${DRAWS.knockoutBracket}T12:00:00Z`).toLocaleDateString('sk-SK')}. Dovtedy
            si môžeš pozície predvyplniť podľa aktuálnej tabuľky — a hocikedy ich prepísať
            ručne.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={table.every((r) => r.played === 0)}
            onClick={seedBracket}
          >
            Nasadiť podľa tabuľky (9.–24. do play-off)
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn text-sm" onClick={seedBracket}>
            ↻ Prenasadiť podľa tabuľky
          </button>
          <button
            type="button"
            className="btn btn-ghost text-sm"
            onClick={() => {
              if (confirm('Naozaj vymazať celý pavúk aj s výsledkami dvojzápasov?')) resetBracket();
            }}
          >
            🗑️ Vymazať pavúk
          </button>
        </div>
      )}

      {/* Keyboard- and screen-reader-friendly list of the same data. */}
      <details className="card">
        <summary className="cursor-pointer font-black">Zoznam dvojzápasov</summary>
        <ul className="mt-2 space-y-1">
          {ties.map((tie) => {
            const outcome = resolveTie(tie);
            const a = tie.teamAId ? teams.get(tie.teamAId) : undefined;
            const b = tie.teamBId ? teams.get(tie.teamBId) : undefined;
            return (
              <li key={tie.id}>
                <button
                  type="button"
                  className="surface-2 flex w-full items-center gap-2 rounded-xl p-2 text-left text-sm"
                  onClick={() => setOpenTieId(tie.id)}
                >
                  <span className="w-20 shrink-0 text-xs muted">{ROUND_LABELS[tie.round]}</span>
                  <TeamTile team={a} size="sm" />
                  <span className="min-w-0 flex-1 truncate">
                    {a?.name ?? '—'} – {b?.name ?? '—'}
                  </span>
                  {outcome.aggregate ? (
                    <span className="font-black tabular-nums">
                      {outcome.aggregate.a}:{outcome.aggregate.b}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </details>

      <TieSheet tie={editing} onClose={() => setOpenTieId(null)} whatIfMode={whatIfActive} />
    </div>
  );
}
