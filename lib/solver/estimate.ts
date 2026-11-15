import { createHandSet } from "./evaluation";
import { type Spot, validateSpot } from "./spot";
import { countTree, type TreeStats } from "./tree";

/** Refuse Spots whose solve would need more than this. */
export const MEMORY_BUDGET_BYTES = 400 * 2 ** 20;

/** Measured heap per tree node object in V8 (≈ 265 B), rounded up. */
const NODE_BYTES = 300;

export type SpotEstimate = TreeStats & {
  /** Live Combos per player on the board. */
  combos: [number, number];
  /** Regrets, average strategies, showdown rankings and tree nodes. */
  memoryBytes: number;
  budgetBytes: number;
  fits: boolean;
};

export type EstimateResult = { ok: true; estimate: SpotEstimate } | { ok: false; error: string };

/** Sizes the solve before anything is allocated. */
export function estimateSpot(spot: Spot, budgetBytes = MEMORY_BUDGET_BYTES): EstimateResult {
  const error = validateSpot(spot);
  if (error) return { error, ok: false };
  const stats = countTree(spot);
  const combos: [number, number] = [createHandSet(spot.ranges[0], spot.board).combos.length, createHandSet(spot.ranges[1], spot.board).combos.length];
  const storage = (stats.actionSlots[0] * combos[0] + stats.actionSlots[1] * combos[1]) * 2 * Float32Array.BYTES_PER_ELEMENT;
  const rankings = stats.runouts * (combos[0] + combos[1]) * (Uint16Array.BYTES_PER_ELEMENT + Int32Array.BYTES_PER_ELEMENT);
  const memoryBytes = storage + rankings + (stats.actionNodes + stats.chanceNodes + stats.terminalNodes) * NODE_BYTES;
  return { estimate: { ...stats, budgetBytes, combos, fits: memoryBytes <= budgetBytes, memoryBytes }, ok: true };
}

export const formatMegabytes = (bytes: number) => `${Math.max(1, Math.ceil(bytes / 2 ** 20))} MB`;

/** Why a Spot is refused, with only the fixes its setup offers. The engine and the Solver tool both show it. */
export function overBudgetMessage(estimate: SpotEstimate, spot: Pick<Spot, "betSizes" | "board">): string {
  const fixes = ["Narrow the ranges", ...(spot.betSizes.length > 1 ? ["drop a bet size"] : []), ...(spot.board.length < 5 ? ["start from a later street"] : [])];
  const advice = fixes.length > 1 ? `${fixes.slice(0, -1).join(", ")} or ${fixes.at(-1)}` : fixes[0];
  return `This spot needs about ${formatMegabytes(estimate.memoryBytes)}, above the ${formatMegabytes(estimate.budgetBytes)} budget. ${advice}.`;
}
