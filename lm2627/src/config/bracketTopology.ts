// ---------------------------------------------------------------------------
// SHAPE OF THE KNOCKOUT BRACKET
//
// 23 ties in total: 8 play-off, 8 round of 16, 4 quarter-final, 2 semi-final,
// 1 final. The bracket is predetermined ("tennis format") from the round of 16
// on, so seeds 1 and 2 sit in opposite halves and can only meet in the final.
//
// !!! The two pairing tables below (PLAYOFF_PAIRS and R16_PAIRS) are OUR
// default reading of the format, not a verified quotation of the regulations.
// Check them against the official rules once the play-off draw procedure is
// published and edit them here — the whole app follows this file.
// See NOTES.md.
// ---------------------------------------------------------------------------

import type { KnockoutTie, KnockoutRound } from '../types';

/**
 * Play-off: the eight teams finishing 9–16 are seeded and are drawn against the
 * eight teams finishing 17–24. The seeded team hosts the second leg.
 * [seededPosition, unseededPosition]
 */
export const PLAYOFF_PAIRS: Array<[number, number]> = [
  [9, 24],
  [10, 23],
  [11, 22],
  [12, 21],
  [13, 20],
  [14, 19],
  [15, 18],
  [16, 17],
];

/**
 * Round of 16, listed top-to-bottom as drawn on screen. Each tie is a team
 * finishing 1–8 against the winner of one play-off tie (1-based index into
 * PLAYOFF_PAIRS). The order of the league-phase seeds follows the standard
 * 16-team bracket order (1, 8, 4, 5, 3, 6, 2, 7), which is what keeps seeds 1
 * and 2 apart until the final.
 */
export const R16_PAIRS: Array<{ seed: number; playoffTie: number }> = [
  { seed: 1, playoffTie: 8 },
  { seed: 8, playoffTie: 1 },
  { seed: 4, playoffTie: 5 },
  { seed: 5, playoffTie: 4 },
  { seed: 3, playoffTie: 6 },
  { seed: 6, playoffTie: 3 },
  { seed: 2, playoffTie: 7 },
  { seed: 7, playoffTie: 2 },
];

export const tieId = (round: KnockoutRound, slot: number) => `${round}-${slot}`;

/** Which tie a winner moves into, and on which side of it. */
export function nextTie(
  round: KnockoutRound,
  slot: number,
): { id: string; side: 'A' | 'B' } | undefined {
  if (round === 'F') return undefined;
  if (round === 'PO') {
    // The play-off winner takes side B of its round-of-16 tie; side A is the
    // top-8 team, which hosts the second leg.
    const target = R16_PAIRS.findIndex((p) => p.playoffTie === slot);
    return { id: tieId('R16', target + 1), side: 'B' };
  }
  const nextRound: Record<'R16' | 'QF' | 'SF', KnockoutRound> = {
    R16: 'QF',
    QF: 'SF',
    SF: 'F',
  };
  const target = Math.ceil(slot / 2);
  return { id: tieId(nextRound[round], target), side: slot % 2 === 1 ? 'A' : 'B' };
}

/** Number of ties in each round. */
export const ROUND_SIZES: Array<{ round: KnockoutRound; count: number }> = [
  { round: 'PO', count: 8 },
  { round: 'R16', count: 8 },
  { round: 'QF', count: 4 },
  { round: 'SF', count: 2 },
  { round: 'F', count: 1 },
];

/**
 * League-phase finishing positions that feed a tie directly (i.e. before any
 * knockout match has been played). Used by the "seed the bracket from the
 * table" action; the play-off draw itself is random, so this only gives the
 * positions, and the user can swap teams by hand afterwards.
 */
export function directSeeds(round: KnockoutRound, slot: number): { a?: number; b?: number } {
  if (round === 'PO') {
    const pair = PLAYOFF_PAIRS[slot - 1];
    return { a: pair[0], b: pair[1] };
  }
  if (round === 'R16') return { a: R16_PAIRS[slot - 1].seed };
  return {};
}

/** Builds the full, empty 23-tie bracket. */
export function createEmptyBracket(): KnockoutTie[] {
  const ties: KnockoutTie[] = [];
  for (const { round, count } of ROUND_SIZES) {
    for (let slot = 1; slot <= count; slot++) {
      const next = nextTie(round, slot);
      ties.push({
        id: tieId(round, slot),
        round,
        slot,
        legs: [undefined, undefined],
        feedsInto: next?.id,
        feedsSide: next?.side,
      });
    }
  }
  return ties;
}
