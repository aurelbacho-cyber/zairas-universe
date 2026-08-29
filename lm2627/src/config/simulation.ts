// ---------------------------------------------------------------------------
// TEAM STRENGTH MODEL + MONTE CARLO PARAMETERS
//
// Deliberately simple and all in one file so it is easy to tune. The model is
// only used for (a) the scenario calculator and (b) deciding who the
// "favourite" was in a match, for the prediction upset bonus.
// It is a toy model, not a betting model — see NOTES.md.
// ---------------------------------------------------------------------------

/**
 * Baseline expected goals per match by pot. Pot 1 clubs are the strongest, pot
 * 4 the weakest. These numbers are a starting guess, tune them freely.
 */
export const POT_ATTACK: Record<1 | 2 | 3 | 4, number> = {
  1: 1.75,
  2: 1.40,
  3: 1.20,
  4: 0.95,
};

/** Baseline expected goals conceded per match by pot. */
export const POT_DEFENCE: Record<1 | 2 | 3 | 4, number> = {
  1: 0.90,
  2: 1.15,
  3: 1.35,
  4: 1.70,
};

/** Multiplier applied to the home team's expected goals. */
export const HOME_ADVANTAGE = 1.15;

/**
 * How strongly results so far override the pot baseline. 0 = ignore results
 * and trust the pots; 1 = trust the results only. The blend ramps up as a team
 * plays more matches, reaching this value after all 8 are played.
 */
export const FORM_WEIGHT = 0.6;

/** Number of simulated seasons. */
export const SIMULATION_RUNS = 10_000;

/** Goals are drawn from a Poisson distribution capped at this value. */
export const MAX_GOALS = 9;

/**
 * Converts a pot into a single strength number, used to pick the favourite of
 * a match (higher = stronger). Attack minus defence keeps it monotone in pot.
 */
export function baseStrength(pot: 1 | 2 | 3 | 4): number {
  return POT_ATTACK[pot] - POT_DEFENCE[pot];
}
