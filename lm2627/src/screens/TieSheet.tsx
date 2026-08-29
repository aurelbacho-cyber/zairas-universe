import { useSeasonStore } from '../store/useSeasonStore';
import { useTeamMap } from '../store/selectors';
import { Sheet } from '../components/Sheet';
import { ScoreStepper } from '../components/ScoreStepper';
import { TeamTile } from '../components/TeamTile';
import { Stars } from '../components/Stars';
import { resolveTie } from '../lib/bracket';
import { ROUND_LABELS, KNOCKOUT_ROUNDS } from '../config/calendar';
import type { KnockoutTie } from '../types';

/**
 * Editor for one two-legged tie: both legs, then extra time and penalties if
 * the aggregate is level. The higher seed hosts the second leg, so leg 1 is at
 * team B's ground and leg 2 at team A's.
 */
export function TieSheet({
  tie,
  onClose,
  whatIfMode,
}: {
  tie: KnockoutTie | null;
  onClose: () => void;
  whatIfMode: boolean;
}) {
  const setLegScore = useSeasonStore((s) => s.setLegScore);
  const patchLeg = useSeasonStore((s) => s.patchLeg);
  const setExtraTime = useSeasonStore((s) => s.setExtraTime);
  const setPenalties = useSeasonStore((s) => s.setPenalties);
  const setTieTeams = useSeasonStore((s) => s.setTieTeams);
  const setWhatIfWinner = useSeasonStore((s) => s.setWhatIfWinner);
  const teams = useSeasonStore((s) => s.teams);
  const teamMap = useTeamMap();

  if (!tie) return null;

  const a = tie.teamAId ? teamMap.get(tie.teamAId) : undefined;
  const b = tie.teamBId ? teamMap.get(tie.teamBId) : undefined;
  const outcome = resolveTie(tie);
  const level = outcome.aggregate && outcome.aggregate.a === outcome.aggregate.b;
  const round = KNOCKOUT_ROUNDS.find((r) => r.round === tie.round);
  const isFinal = tie.round === 'F';

  return (
    <Sheet
      open
      onClose={onClose}
      title={`${ROUND_LABELS[tie.round]}${isFinal ? '' : ` — dvojzápas ${tie.slot}`}`}
    >
      {whatIfMode ? (
        <div className="card mb-3" style={{ borderColor: 'var(--app-accent)' }}>
          <p className="text-sm font-bold">🔮 Režim „Čo ak…"</p>
          <p className="mb-2 text-xs muted">
            Vyber, kto by postúpil. Skutočné výsledky sa nezmenia.
          </p>
          <div className="flex flex-wrap gap-2">
            {[a, b].map((team) =>
              team ? (
                <button
                  key={team.id}
                  type="button"
                  className="btn text-sm"
                  onClick={() => {
                    setWhatIfWinner(tie.id, team.id);
                    onClose();
                  }}
                >
                  <TeamTile team={team} size="sm" /> {team.name}
                </button>
              ) : null,
            )}
            <button
              type="button"
              className="btn btn-ghost text-sm"
              onClick={() => {
                setWhatIfWinner(tie.id, undefined);
                onClose();
              }}
            >
              Zrušiť hypotézu
            </button>
          </div>
        </div>
      ) : null}

      {/* Participants — editable by hand because the draw is random. */}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-bold">
          {isFinal ? 'Tím A' : 'Vyššie nasadený (doma v odvete)'}
          <select
            className="input mt-1"
            value={tie.teamAId ?? ''}
            onChange={(e) => setTieTeams(tie.id, e.target.value || undefined, tie.teamBId)}
          >
            <option value="">— zatiaľ neurčené —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          {isFinal ? 'Tím B' : 'Súper'}
          <select
            className="input mt-1"
            value={tie.teamBId ?? ''}
            onChange={(e) => setTieTeams(tie.id, tie.teamAId, e.target.value || undefined)}
          >
            <option value="">— zatiaľ neurčené —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {([0, 1] as const).map((index) => {
        if (isFinal && index === 1) return null;
        // Leg 1 is hosted by B, leg 2 by A.
        const homeTeam = index === 0 ? b : a;
        const awayTeam = index === 0 ? a : b;
        const leg = tie.legs[index];
        const window = round?.legs[index];
        return (
          <div key={index} className="card mt-3">
            <h3 className="font-black">
              {isFinal ? 'Finále' : `${index + 1}. zápas`}
              {window ? (
                <span className="ml-2 text-xs font-normal muted">
                  {window.from === window.to ? formatDay(window.from) : `${formatDay(window.from)} / ${formatDay(window.to)}`}
                </span>
              ) : null}
            </h3>
            {round?.venue && isFinal ? <p className="text-xs muted">{round.venue}</p> : null}

            <div className="mt-2 space-y-2">
              <LegSide
                label={`${homeTeam?.name ?? 'domáci'} (doma)`}
                team={homeTeam}
                value={leg?.score?.home}
                onChange={(next) =>
                  setLegScore(tie.id, index, {
                    home: next,
                    away: leg?.score?.away ?? 0,
                  })
                }
              />
              <LegSide
                label={`${awayTeam?.name ?? 'hostia'} (vonku)`}
                team={awayTeam}
                value={leg?.score?.away}
                onChange={(next) =>
                  setLegScore(tie.id, index, {
                    home: leg?.score?.home ?? 0,
                    away: next,
                  })
                }
              />
            </div>

            {leg?.score ? (
              <button
                type="button"
                className="btn btn-ghost mt-2 text-xs"
                onClick={() => setLegScore(tie.id, index, undefined)}
              >
                Vymazať výsledok
              </button>
            ) : null}

            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-bold">📖 Do kroniky</summary>
              <label className="mt-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-6 w-6"
                  checked={leg?.watchedTogether ?? false}
                  onChange={(e) => patchLeg(tie.id, index, { watchedTogether: e.target.checked })}
                />
                <span className="font-bold">Pozerali sme spolu 👀</span>
              </label>
              <div className="mt-2">
                <Stars
                  value={leg?.rating}
                  onChange={(rating) => patchLeg(tie.id, index, { rating })}
                />
              </div>
              <input
                className="input mt-2"
                placeholder="Moment zápasu"
                value={leg?.momentOfMatch ?? ''}
                onChange={(e) => patchLeg(tie.id, index, { momentOfMatch: e.target.value })}
              />
              <textarea
                className="input mt-2 min-h-[4rem] py-2"
                placeholder="Poznámka"
                value={leg?.note ?? ''}
                onChange={(e) => patchLeg(tie.id, index, { note: e.target.value })}
              />
            </details>
          </div>
        );
      })}

      {outcome.aggregate ? (
        <p className="mt-3 text-center text-lg font-black">
          Celkovo {outcome.aggregate.a}:{outcome.aggregate.b}
          {outcome.decidedBy === 'extraTime' ? ' (po predĺžení)' : ''}
          {outcome.decidedBy === 'penalties' ? ' (na penalty)' : ''}
        </p>
      ) : null}

      {level && !isFinal ? (
        <div className="card mt-3" style={{ borderColor: '#eab308' }}>
          <h3 className="font-black">Nerozhodne po dvoch zápasoch</h3>
          <p className="text-xs muted">
            Gól na ihrisku súpera neplatí — nasleduje predĺženie a prípadne penalty. Zadaj ich
            z pohľadu {a?.name ?? 'tímu A'} (doma) proti {b?.name ?? 'tímu B'}.
          </p>
          <ExtraBlock
            title="Predĺženie"
            score={tie.extraTime}
            onChange={(score) => setExtraTime(tie.id, score)}
            homeName={a?.name}
            awayName={b?.name}
          />
          <ExtraBlock
            title="Penalty"
            score={tie.penalties}
            onChange={(score) => setPenalties(tie.id, score)}
            homeName={a?.name}
            awayName={b?.name}
          />
        </div>
      ) : null}

      {isFinal && level ? (
        <div className="card mt-3" style={{ borderColor: '#eab308' }}>
          <h3 className="font-black">Nerozhodne vo finále</h3>
          <ExtraBlock
            title="Predĺženie"
            score={tie.extraTime}
            onChange={(score) => setExtraTime(tie.id, score)}
            homeName={a?.name}
            awayName={b?.name}
          />
          <ExtraBlock
            title="Penalty"
            score={tie.penalties}
            onChange={(score) => setPenalties(tie.id, score)}
            homeName={a?.name}
            awayName={b?.name}
          />
        </div>
      ) : null}

      {tie.winnerId ? (
        <p className="mt-3 rounded-xl p-2 text-center font-black" style={{ background: 'var(--app-surface-2)' }}>
          ✅ Postupuje {teamMap.get(tie.winnerId)?.name}
        </p>
      ) : null}
    </Sheet>
  );
}

function LegSide({
  label,
  team,
  value,
  onChange,
}: {
  label: string;
  team?: import('../types').Team;
  value?: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="surface-2 flex items-center gap-2 rounded-xl p-2">
      <TeamTile team={team} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm font-bold">{team?.name ?? '—'}</span>
      <ScoreStepper label={label} value={value} onChange={onChange} compact />
    </div>
  );
}

function ExtraBlock({
  title,
  score,
  onChange,
  homeName,
  awayName,
}: {
  title: string;
  score?: { home: number; away: number };
  onChange: (score: { home: number; away: number } | undefined) => void;
  homeName?: string;
  awayName?: string;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">{title}</span>
        {score ? (
          <button type="button" className="btn btn-ghost h-8 min-h-0 px-2 text-xs" onClick={() => onChange(undefined)}>
            Vymazať
          </button>
        ) : null}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <ScoreStepper
          label={`${title}, ${homeName ?? 'tím A'}`}
          value={score?.home}
          onChange={(next) => onChange({ home: next, away: score?.away ?? 0 })}
          compact
        />
        <span className="muted">:</span>
        <ScoreStepper
          label={`${title}, ${awayName ?? 'tím B'}`}
          value={score?.away}
          onChange={(next) => onChange({ home: score?.home ?? 0, away: next })}
          compact
        />
      </div>
    </div>
  );
}

const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' });
