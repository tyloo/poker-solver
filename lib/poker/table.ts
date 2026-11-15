/** 8-max Positions in acting order preflop. */
export const POSITIONS = ["UTG", "UTG+1", "LJ", "HJ", "CO", "BTN", "SB", "BB"] as const;

export type Position = (typeof POSITIONS)[number];

/** Where a Position acts preflop: 0 for UTG to 7 for the BB. */
export const preflopOrder = (position: Position) => POSITIONS.indexOf(position);

/** Where a Position acts postflop: the blinds first, then the rest in preflop order. */
export const postflopOrder = (position: Position) => (position === "SB" ? -2 : position === "BB" ? -1 : preflopOrder(position));

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = POSITIONS.length;

/** Positions at a table of `players`; short-handed tables drop the earliest Positions first. */
export function tablePositions(players: number): readonly Position[] {
  if (!Number.isInteger(players) || players < MIN_PLAYERS || players > MAX_PLAYERS) throw new Error(`A table has ${MIN_PLAYERS} to ${MAX_PLAYERS} players, not ${players}`);
  return POSITIONS.slice(MAX_PLAYERS - players);
}

export const STACK_TIERS = ["40bb+", "25bb", "15-20bb"] as const;

export type StackTier = (typeof STACK_TIERS)[number];

export const STACK_TIER_LABELS: Record<StackTier, string> = { "15-20bb": "15–20bb", "25bb": "25bb", "40bb+": "40bb+" };

/** Open raise size in big blinds for each Stack tier. */
export const OPEN_SIZE_BB: Record<StackTier, number> = { "15-20bb": 2, "25bb": 2, "40bb+": 2.5 };

/**
 * The Stack tier whose Charts apply at a Stack depth: ≥33bb uses 40bb+, 21–32bb uses 25bb,
 * 15–20bb uses 15–20bb, and below 15bb the Push/fold charts apply. Depths between tiers round down.
 */
export function stackTierFor(depth: number): StackTier | "push-fold" {
  if (depth >= 33) return "40bb+";
  if (depth >= 21) return "25bb";
  if (depth >= 15) return "15-20bb";
  return "push-fold";
}
