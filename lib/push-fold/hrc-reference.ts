import { HAND_CLASS_COUNT, handClassCombos, parseHandClass } from "@/lib/poker/combo";

/*
 * Hand-picked reference values for the heads-up (SB vs BB) push/fold game, chip EV, no antes.
 *
 * Source: HoldemResources.net, "Heads-up Push/Fold Nash Equilibrium", No Ante tab,
 * https://www.holdemresources.net/hune, raw data `holdemresources_hu_equilibrium.zip`
 * (holdemresources_hu_push.csv / holdemresources_hu_call.csv, stacks 1–200bb in 0.05bb steps,
 * effective stack before posting blinds of 0.5 / 1bb). Only these few values are copied here.
 */

/** Share of all 1326 Combos (Σ combos × frequency) the SB pushes at each whole stack, 1–15bb. */
export const HU_PUSH_SHARE = [100.0, 89.44, 77.96, 73.76, 71.49, 68.34, 66.31, 61.86, 59.88, 58.29, 54.49, 53.24, 51.54, 48.36, 45.66];

/** Share of all 1326 Combos the BB calls with facing the SB's push at each whole stack, 1–15bb. */
export const HU_CALL_SHARE = [100.0, 100.0, 92.27, 74.06, 62.07, 54.45, 48.61, 44.97, 40.57, 37.38, 35.05, 33.03, 30.96, 29.3, 28.55];

/**
 * Largest stack (0.05bb steps, up to 20bb) at which the Hand class is played at least half the time;
 * Infinity = still played at 20bb. Every listed class is played at every stack below that.
 */
export const HU_PUSH_MAX_STACK: Readonly<Record<string, number>> = {
  "22": Infinity,
  "32o": 1.4,
  "72o": 1.6,
  "86o": 7.0,
  "96s": Infinity,
  "97s": Infinity,
  A2o: Infinity,
  J2s: 8.55,
  J6s: 18.65,
  J8o: 13.3,
  JTs: Infinity,
  K2o: 11.65,
  K5o: 14.25,
  K9o: Infinity,
  Q2o: 7.05,
  Q4s: 16.3,
  Q7o: 10.35,
  QTo: Infinity,
  T2s: 6.5,
  T6o: 5.7,
};

export const HU_CALL_MAX_STACK: Readonly<Record<string, number>> = {
  "22": 15.05,
  "32o": 2.65,
  "72o": 2.65,
  "86o": 4.1,
  "96s": 5.85,
  "97s": 7.0,
  A2o: 15.85,
  J2s: 5.65,
  J6s: 7.05,
  J8o: 7.6,
  JTs: 18.0,
  K2o: 8.15,
  K5o: 10.2,
  K8o: 13.85,
  K9o: 17.15,
  Q2o: 5.6,
  Q4s: 8.45,
  Q7o: 8.0,
  QTo: 15.35,
  T2s: 4.55,
  T6o: 4.65,
};

/** Shares may differ by this many percentage points (rounding of mixed Hand classes). */
const SHARE_TOLERANCE = 0.5;
/** Stacks this close to a Hand class's threshold are skipped: the class is near-indifferent there. */
const THRESHOLD_MARGIN = 0.15;

const shareOf = (frequencies: Float64Array) => {
  let sum = 0;
  for (let cls = 0; cls < HAND_CLASS_COUNT; cls++) sum += frequencies[cls] * handClassCombos(cls).length;
  return (sum / 1326) * 100;
};

/**
 * Where solved (or charted) heads-up frequencies disagree with the reference, one line per problem.
 * `byStack[s - 1]` holds the frequency per Hand class at stack s.
 */
export function headsUpMismatches(label: string, byStack: readonly Float64Array[], shares: readonly number[], maxStacks: Readonly<Record<string, number>>): string[] {
  const problems: string[] = [];
  byStack.forEach((frequencies, index) => {
    const stack = index + 1;
    const share = shareOf(frequencies);
    if (Math.abs(share - shares[index]) > SHARE_TOLERANCE) problems.push(`${label} at ${stack}bb: ${share.toFixed(2)}% of hands, reference ${shares[index]}%`);
    for (const [name, max] of Object.entries(maxStacks)) {
      if (Math.abs(stack - max) <= THRESHOLD_MARGIN) continue;
      const played = frequencies[parseHandClass(name) ?? -1] >= 0.5;
      if (played !== stack < max) problems.push(`${label} at ${stack}bb: ${name} ${played ? "played" : "folded"}, reference plays it up to ${max}bb`);
    }
  });
  return problems;
}

/**
 * All-in preflop equity of AA vs KK (class average, ties half): 81.95% at CardFight,
 * https://www.cardfight.com/AA_KK.html. A quick check that the equity matrix is right.
 */
export const AA_VS_KK_EQUITY = 0.8195;
