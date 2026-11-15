import type { EstimateResult, SpotEstimate } from "./estimate";
import type { NodeView } from "./solver";
import type { Spot } from "./spot";

export type SolveOptions = {
  /** Stop once exploitability is at most this share of the starting pot. Default 0.005 (0.5%). */
  targetExploitability?: number;
  /** Stop after this many iterations in total. Default 1000. */
  maxIterations?: number;
  /** Iterations between exploitability checks. Default 10. */
  checkEvery?: number;
};

export const DEFAULT_SOLVE_OPTIONS: Required<SolveOptions> = { checkEvery: 10, maxIterations: 1000, targetExploitability: 0.005 };

export type SolveStatus = {
  iteration: number;
  /** Chips per hand, from the latest check; null before the first. */
  exploitability: number | null;
  /** The same as a share of the starting pot (0.005 = 0.5%). */
  exploitabilityShare: number | null;
  /** Solving time, excluding pauses. */
  elapsedMs: number;
};

export type DoneReason = "converged" | "stopped" | "max-iterations";

/**
 * Main thread → worker. A `solve` replaces any earlier one; `solveId` tags every message about it
 * so stale replies can be dropped. Queries read the current average strategy, during or after a solve.
 */
export type SolverRequest =
  | { type: "estimate"; requestId: number; spot: Spot }
  | { type: "solve"; solveId: number; spot: Spot; options?: SolveOptions }
  | { type: "stop"; solveId: number }
  | { type: "resume"; solveId: number; options?: SolveOptions }
  | { type: "query"; solveId: number; requestId: number; path: number[] };

/** Worker → main thread. */
export type SolverResponse =
  | { type: "estimate"; requestId: number; result: EstimateResult }
  | { type: "started"; solveId: number; estimate: SpotEstimate }
  | { type: "progress"; solveId: number; status: SolveStatus }
  | { type: "done"; solveId: number; reason: DoneReason; status: SolveStatus }
  | { type: "node"; solveId: number; requestId: number; node: NodeView }
  | { type: "error"; solveId?: number; requestId?: number; message: string };
