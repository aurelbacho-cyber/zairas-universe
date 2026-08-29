import type { KnockoutRound, KnockoutTie } from '../types';
import { R16_PAIRS, ROUND_SIZES } from '../config/bracketTopology';

export const BOX = { width: 168, height: 60 };
export const COLUMN_GAP = 62;
export const ROW_GAP = 96;
export const PADDING = { x: 14, y: 46 };

export type PlacedTie = { tie: KnockoutTie; x: number; y: number };

const COLUMN_ORDER: KnockoutRound[] = ['PO', 'R16', 'QF', 'SF', 'F'];

/**
 * Lays the bracket out left to right: play-offs, round of 16, quarter-finals,
 * semi-finals, final. Every tie sits vertically centred between the two ties
 * that feed it, which is what makes a bracket readable.
 *
 * A play-off tie is drawn level with the round-of-16 tie it feeds, so the
 * eye can follow one line from the play-off all the way to the final.
 */
export function layoutBracket(ties: KnockoutTie[]): {
  placed: PlacedTie[];
  width: number;
  height: number;
  columnX: Record<KnockoutRound, number>;
} {
  const byId = new Map(ties.map((t) => [t.id, t]));
  const positions = new Map<string, { x: number; y: number }>();
  const columnX = {} as Record<KnockoutRound, number>;

  COLUMN_ORDER.forEach((round, i) => {
    columnX[round] = PADDING.x + i * (BOX.width + COLUMN_GAP);
  });

  // Round of 16 sets the vertical rhythm; everything else follows from it.
  const r16 = ROUND_SIZES.find((r) => r.round === 'R16')!.count;
  for (let slot = 1; slot <= r16; slot++) {
    positions.set(`R16-${slot}`, {
      x: columnX.R16,
      y: PADDING.y + (slot - 1) * ROW_GAP,
    });
  }

  // Play-offs line up with the round-of-16 tie they feed into.
  for (let slot = 1; slot <= ROUND_SIZES[0].count; slot++) {
    const target = R16_PAIRS.findIndex((p) => p.playoffTie === slot) + 1;
    const anchor = positions.get(`R16-${target}`);
    positions.set(`PO-${slot}`, {
      x: columnX.PO,
      y: anchor ? anchor.y : PADDING.y + (slot - 1) * ROW_GAP,
    });
  }

  // Later rounds sit midway between their two feeders.
  for (const round of ['QF', 'SF', 'F'] as const) {
    const count = ROUND_SIZES.find((r) => r.round === round)!.count;
    const previous = round === 'QF' ? 'R16' : round === 'SF' ? 'QF' : 'SF';
    for (let slot = 1; slot <= count; slot++) {
      const a = positions.get(`${previous}-${slot * 2 - 1}`);
      const b = positions.get(`${previous}-${slot * 2}`);
      const y = a && b ? (a.y + b.y) / 2 : PADDING.y + (slot - 1) * ROW_GAP;
      positions.set(`${round}-${slot}`, { x: columnX[round], y });
    }
  }

  const placed: PlacedTie[] = [];
  for (const [id, pos] of positions) {
    const tie = byId.get(id);
    if (tie) placed.push({ tie, x: pos.x, y: pos.y });
  }
  placed.sort(
    (a, b) =>
      COLUMN_ORDER.indexOf(a.tie.round) - COLUMN_ORDER.indexOf(b.tie.round) || a.tie.slot - b.tie.slot,
  );

  const width = columnX.F + BOX.width + PADDING.x;
  const height = PADDING.y + (r16 - 1) * ROW_GAP + BOX.height + PADDING.y;
  return { placed, width, height, columnX };
}

/** Elbow connector from a tie's right edge to the left edge of the next one. */
export function connectorPath(from: PlacedTie, to: PlacedTie): string {
  const x1 = from.x + BOX.width;
  const y1 = from.y + BOX.height / 2;
  const x2 = to.x;
  const y2 = to.y + BOX.height / 2;
  const mid = x1 + (x2 - x1) / 2;
  return `M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`;
}
