import { useCallback, useEffect, useRef, useState } from 'react';
import type { KnockoutTie, Team } from '../types';
import { BOX, connectorPath, layoutBracket, type PlacedTie } from '../lib/bracketLayout';
import { ROUND_LABELS } from '../config/calendar';
import { resolveTie } from '../lib/bracket';
import { readableOn } from './TeamTile';

type Props = {
  ties: KnockoutTie[];
  teams: Map<string, Team>;
  onSelect: (tieId: string) => void;
  highlightPath: Set<string>;
  hypothetical: Set<string>;
  favouriteTeamId?: string;
};

/**
 * Hand-drawn SVG bracket with pinch-to-zoom and finger panning. Written by
 * hand rather than with a chart library so that zooming, panning and the
 * 375px phone case are all fully under our control.
 */
export function BracketSvg({
  ties,
  teams,
  onSelect,
  highlightPath,
  hypothetical,
  favouriteTeamId,
}: Props) {
  const { placed, width, height } = layoutBracket(ties);
  const byId = new Map(placed.map((p) => [p.tie.id, p]));

  const containerRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ distance: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  /** Scale the whole bracket down to fit, and centre it in the box. */
  const fitToView = useCallback(() => {
    const el = containerRef.current;
    if (!el || !el.clientWidth) return;
    const pad = 10;
    const scale = Math.min(
      1,
      (el.clientWidth - pad * 2) / width,
      (el.clientHeight - pad * 2) / height,
    );
    setView({
      scale,
      x: (el.clientWidth - width * scale) / 2,
      y: (el.clientHeight - height * scale) / 2,
    });
  }, [width, height]);

  // Fit on mount and whenever the box changes size (rotation, resize).
  useEffect(() => {
    fitToView();
    const el = containerRef.current;
    if (!el) return;
    setAvailable(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      setAvailable(el.clientWidth);
      fitToView();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitToView]);

  /**
   * Height of the box follows the drawing: at the width we have, the whole
   * bracket needs this much room. Without it a phone shows a tall empty panel
   * under a small bracket.
   */
  const boxHeight = (() => {
    if (!available) return 380;
    const scaleByWidth = Math.min(1, (available - 20) / width);
    return Math.round(Math.min(560, Math.max(260, height * scaleByWidth + 20)));
  })();

  /**
   * Standard map-style clamping. When the bracket is bigger than the box its
   * edges can never be dragged inside it, and when it is smaller it stays
   * fully inside — so panning never lands on empty space and the bracket can
   * never be lost off-screen.
   */
  const clamp = useCallback(
    (next: typeof view) => {
      const scale = Math.min(3, Math.max(0.25, next.scale));
      const el = containerRef.current;
      if (!el) return { ...next, scale };
      const axis = (value: number, content: number, box: number) => {
        const [lo, hi] = content > box ? [box - content, 0] : [0, box - content];
        return Math.min(hi, Math.max(lo, value));
      };
      return {
        scale,
        x: axis(next.x, width * scale, el.clientWidth),
        y: axis(next.y, height * scale, el.clientHeight),
      };
    },
    [width, height],
  );

  /** Zooms around the centre of the box so the view does not jump. */
  const zoomBy = useCallback(
    (factor: number) =>
      setView((v) => {
        const el = containerRef.current;
        const scale = Math.min(3, Math.max(0.25, v.scale * factor));
        if (!el) return { ...v, scale };
        const cx = el.clientWidth / 2;
        const cy = el.clientHeight / 2;
        const ratio = scale / v.scale;
        return clamp({ scale, x: cx - (cx - v.x) * ratio, y: cy - (cy - v.y) * ratio });
      }),
    [clamp],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);

    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = distance / (gesture.current.distance || 1);
      setView((v) => clamp({ ...v, scale: gesture.current!.scale * ratio }));
      return;
    }
    if (pointers.current.size === 1) {
      setView((v) =>
        clamp({ ...v, x: v.x + (next.x - previous.x), y: v.y + (next.y - previous.y) }),
      );
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
  };

  /** Double tap zooms into the branch that was tapped. */
  const onDoubleTapArea = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      zoomBy(view.scale < 1.4 ? 2 : 0.5);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && Math.abs(e.deltaY) < 2) return;
    zoomBy(e.deltaY > 0 ? 0.92 : 1.08);
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="surface relative touch-none overflow-hidden rounded-2xl"
        style={{ height: boxHeight }}
        onPointerDown={(e) => {
          onPointerDown(e);
          onDoubleTapArea();
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <svg
          width="100%"
          height="100%"
          role="group"
          aria-label="Pavúk vyraďovacej fázy Ligy majstrov 2026/27"
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
            {/* connectors first so the boxes sit on top */}
            {placed.map(({ tie }) => {
              if (!tie.feedsInto) return null;
              const from = byId.get(tie.id);
              const to = byId.get(tie.feedsInto);
              if (!from || !to) return null;
              const lit = highlightPath.has(tie.id) && highlightPath.has(tie.feedsInto);
              return (
                <path
                  key={`link-${tie.id}`}
                  d={connectorPath(from, to)}
                  fill="none"
                  stroke={lit ? 'var(--app-accent)' : 'var(--app-border)'}
                  strokeWidth={lit ? 3 : 2}
                />
              );
            })}

            {columnHeaders(placed).map((header) => (
              <text
                key={header.round}
                x={header.x + BOX.width / 2}
                y={22}
                textAnchor="middle"
                fontSize={14}
                fontWeight={800}
                fill="var(--app-muted)"
              >
                {ROUND_LABELS[header.round]}
              </text>
            ))}

            {placed.map((p) => (
              <TieBox
                key={p.tie.id}
                placed={p}
                teams={teams}
                onSelect={onSelect}
                highlighted={highlightPath.has(p.tie.id)}
                hypothetical={hypothetical.has(p.tie.id)}
                favouriteTeamId={favouriteTeamId}
              />
            ))}
          </g>
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs muted">
        <button type="button" className="btn btn-ghost h-8 min-h-0 px-3 text-xs" onClick={() => zoomBy(1.25)}>
          ➕ Priblížiť
        </button>
        <button type="button" className="btn btn-ghost h-8 min-h-0 px-3 text-xs" onClick={() => zoomBy(0.8)}>
          ➖ Oddialiť
        </button>
        <button
          type="button"
          className="btn btn-ghost h-8 min-h-0 px-3 text-xs"
          onClick={fitToView}
        >
          ⛶ Celý pavúk
        </button>
        <span>Ťahaj prstom, dvoma prstami priblíž, dvojklik = zoom.</span>
      </div>

      <p className="sr-only">
        Pavúk sa dá ovládať aj bez SVG: každý dvojzápas je tlačidlo v zozname pod pavúkom.
      </p>
    </div>
  );
}

function columnHeaders(placed: PlacedTie[]) {
  const seen = new Map<string, number>();
  for (const p of placed) if (!seen.has(p.tie.round)) seen.set(p.tie.round, p.x);
  return [...seen.entries()].map(([round, x]) => ({ round: round as keyof typeof ROUND_LABELS, x }));
}

function TieBox({
  placed,
  teams,
  onSelect,
  highlighted,
  hypothetical,
  favouriteTeamId,
}: {
  placed: PlacedTie;
  teams: Map<string, Team>;
  onSelect: (id: string) => void;
  highlighted: boolean;
  hypothetical: boolean;
  favouriteTeamId?: string;
}) {
  const { tie, x, y } = placed;
  const outcome = resolveTie(tie);
  const a = tie.teamAId ? teams.get(tie.teamAId) : undefined;
  const b = tie.teamBId ? teams.get(tie.teamBId) : undefined;

  const describe = `${ROUND_LABELS[tie.round]}, dvojzápas ${tie.slot}: ${a?.name ?? 'zatiaľ neurčené'} proti ${
    b?.name ?? 'zatiaľ neurčené'
  }${outcome.aggregate ? `, celkovo ${outcome.aggregate.a} ku ${outcome.aggregate.b}` : ''}${
    tie.winnerId ? `, postupuje ${teams.get(tie.winnerId)?.name ?? ''}` : ''
  }`;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={describe}
      className="cursor-pointer"
      onClick={() => onSelect(tie.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(tie.id);
        }
      }}
    >
      <rect
        x={x}
        y={y}
        width={BOX.width}
        height={BOX.height}
        rx={12}
        fill="var(--app-surface-2)"
        stroke={highlighted ? 'var(--app-accent)' : 'var(--app-border)'}
        strokeWidth={highlighted ? 2.5 : 1.5}
        strokeDasharray={hypothetical ? '5 4' : undefined}
      />
      <TeamRow
        team={a}
        x={x}
        y={y + 4}
        score={outcome.aggregate?.a}
        winner={!!tie.winnerId && tie.winnerId === tie.teamAId}
        favourite={!!favouriteTeamId && tie.teamAId === favouriteTeamId}
      />
      <TeamRow
        team={b}
        x={x}
        y={y + 4 + 26}
        score={outcome.aggregate?.b}
        winner={!!tie.winnerId && tie.winnerId === tie.teamBId}
        favourite={!!favouriteTeamId && tie.teamBId === favouriteTeamId}
      />
      {outcome.decidedBy === 'penalties' ? (
        <text x={x + BOX.width - 6} y={y + BOX.height - 4} textAnchor="end" fontSize={9} fill="var(--app-muted)">
          po penaltách
        </text>
      ) : outcome.decidedBy === 'extraTime' ? (
        <text x={x + BOX.width - 6} y={y + BOX.height - 4} textAnchor="end" fontSize={9} fill="var(--app-muted)">
          po predĺžení
        </text>
      ) : null}
    </g>
  );
}

function TeamRow({
  team,
  x,
  y,
  score,
  winner,
  favourite,
}: {
  team?: Team;
  x: number;
  y: number;
  score?: number;
  winner: boolean;
  favourite: boolean;
}) {
  return (
    <g>
      <rect
        x={x + 6}
        y={y}
        width={22}
        height={22}
        rx={5}
        fill={team ? team.colors.primary : 'transparent'}
        stroke={team ? 'none' : 'var(--app-border)'}
        strokeDasharray={team ? undefined : '3 3'}
      />
      {team ? (
        <text
          x={x + 17}
          y={y + 15.5}
          textAnchor="middle"
          fontSize={9}
          fontWeight={900}
          fill={readableOn(team.colors.primary)}
        >
          {team.short}
        </text>
      ) : null}
      <text
        x={x + 34}
        y={y + 15.5}
        fontSize={12}
        fontWeight={winner ? 900 : 600}
        fill={favourite ? 'var(--app-accent)' : 'var(--app-text)'}
        opacity={team ? 1 : 0.45}
      >
        {truncate(team?.name ?? 'zatiaľ neurčené', 15)}
      </text>
      {score !== undefined ? (
        <text
          x={x + BOX.width - 8}
          y={y + 15.5}
          textAnchor="end"
          fontSize={13}
          fontWeight={900}
          fill={winner ? 'var(--app-accent)' : 'var(--app-text)'}
        >
          {score}
        </text>
      ) : null}
    </g>
  );
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
