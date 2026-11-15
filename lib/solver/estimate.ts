import type { SolverError } from "./errors";
import { createHandSet } from "./evaluation";
import { type Spot, validateSpot } from "./spot";
import { countTree, type TreeStats } from "./tree";

const MB = 2 ** 20;

/**
 * What a solve may use without risking the page, from the RAM the browser reports in GB (Chrome's `navigator.deviceMemory`,
 * capped at 8). Safari reports nothing, and iOS ends a page at roughly 1–1.5 GB on recent iPhones, so it gets the middle limit.
 */
export function safeMemoryBytes(deviceMemory: number | undefined): number {
  if (deviceMemory === undefined) return 700 * MB;
  if (deviceMemory >= 8) return 1024 * MB;
  if (deviceMemory >= 4) return 700 * MB;
  return 400 * MB;
}

/** The safe limit when the phone's RAM is unknown. */
export const MEMORY_BUDGET_BYTES = safeMemoryBytes(undefined);

/** No solve goes above this, even when the user accepts the risk of a crash. */
export const MAX_MEMORY_BYTES = 2048 * MB;

/** Measured heap per tree node object in V8 (≈ 265 B), rounded up. */
const NODE_BYTES = 300;

export type SpotEstimate = TreeStats & {
  /** Live Combos per player on the board. */
  combos: [number, number];
  /** Regrets, average strategies, showdown rankings and tree nodes. */
  memoryBytes: number;
  budgetBytes: number;
  /** Within `budgetBytes`. */
  fits: boolean;
  maxBytes: number;
  /** Within the hard cap, so the user may solve it anyway. */
  solvable: boolean;
};

export type EstimateResult = { ok: true; estimate: SpotEstimate } | { ok: false; error: SolverError };

/** Sizes the solve before anything is allocated. */
export function estimateSpot(spot: Spot, requestedBudget = MEMORY_BUDGET_BYTES): EstimateResult {
  const budgetBytes = Math.min(requestedBudget, MAX_MEMORY_BYTES);
  const problem = validateSpot(spot);
  if (problem) return { error: { code: "spot", problem }, ok: false };
  const stats = countTree(spot);
  const combos: [number, number] = [createHandSet(spot.ranges[0], spot.board).combos.length, createHandSet(spot.ranges[1], spot.board).combos.length];
  const storage = (stats.actionSlots[0] * combos[0] + stats.actionSlots[1] * combos[1]) * 2 * Float32Array.BYTES_PER_ELEMENT;
  const rankings = stats.runouts * (combos[0] + combos[1]) * (Uint16Array.BYTES_PER_ELEMENT + Int32Array.BYTES_PER_ELEMENT);
  const memoryBytes = storage + rankings + (stats.actionNodes + stats.chanceNodes + stats.terminalNodes) * NODE_BYTES;
  const estimate = { ...stats, budgetBytes, combos, fits: memoryBytes <= budgetBytes, maxBytes: MAX_MEMORY_BYTES, memoryBytes, solvable: memoryBytes <= MAX_MEMORY_BYTES };
  return { estimate, ok: true };
}

/** Why a Spot is refused, with only the fixes its setup offers. The engine and the Solver tool both show it. */
export const overBudget = (estimate: SpotEstimate, spot: Pick<Spot, "betSizes" | "board">): SolverError => ({
  betSize: spot.betSizes.length > 1,
  budgetBytes: estimate.budgetBytes,
  code: "over-budget",
  laterStreet: spot.board.length < 5,
  memoryBytes: estimate.memoryBytes,
});
