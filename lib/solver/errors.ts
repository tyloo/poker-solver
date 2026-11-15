import type { Player } from "./spot";

/** Why a Spot cannot be solved; `player` is 0 (OOP) or 1 (IP). */
export type SpotProblem =
  | { code: "board-cards" | "bad-card" | "pot" | "stack" | "bet-sizes" | "raise-sizes" | "raise-cap" | "flop-one-bet" }
  | { code: "empty-range"; player: Player };

/**
 * Why the Solver refused or failed, from the engine, its worker or the client. The page words it (`lib/i18n/solver.ts`).
 * `internal` carries an unexpected engine error's own message.
 */
export type SolverError =
  | { code: "spot"; problem: SpotProblem }
  | { code: "over-budget"; memoryBytes: number; budgetBytes: number; betSize: boolean; laterStreet: boolean }
  | { code: "bad-path"; step: number }
  | { code: "blocked-ranges" | "no-solve" | "solve-gone" | "not-started" | "still-running" | "no-worker" }
  | { code: "internal"; message: string };

/** An Error carrying a `SolverError`, for promise rejections and throws. */
export class SolverFailure extends Error {
  readonly error: SolverError;

  constructor(error: SolverError) {
    super(error.code === "internal" ? error.message : `Solver error: ${error.code}`);
    this.name = "SolverFailure";
    this.error = error;
  }
}

/** The `SolverError` of anything thrown. */
export const solverErrorOf = (thrown: unknown): SolverError =>
  thrown instanceof SolverFailure ? thrown.error : { code: "internal", message: thrown instanceof Error ? thrown.message : String(thrown) };
