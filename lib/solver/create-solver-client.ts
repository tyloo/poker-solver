import { connectSolver, type SolverClient } from "./client";

/**
 * Starts a solver Web Worker. Browser only: call it in an effect and `dispose()` in the cleanup.
 * Create it when the Solver tool mounts, so the service worker caches the worker chunks while online.
 */
export function createSolverClient(): SolverClient {
  return connectSolver(new Worker(new URL("./solver.worker.ts", import.meta.url), { type: "module" }));
}
