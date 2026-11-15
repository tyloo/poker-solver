"use client";

import { useEffect, useRef, useState } from "react";
import { connectSolver, type SolveHandlers, type SolveResult, type SolverClient } from "./client";
import { type SolverError, SolverFailure, solverErrorOf } from "./errors";
import type { EstimateResult, SpotEstimate } from "./estimate";
import type { DoneReason, SolveOptions, SolveStatus } from "./protocol";
import type { NodeView } from "./solver";
import type { Spot } from "./spot";

/** `key` identifies the Spot of the solve (see `resolveSetup`). */
export type SolveRun =
  | { status: "idle" }
  | { status: "running"; key: string; estimate: SpotEstimate | null; progress: SolveStatus | null }
  | { status: "done"; key: string; estimate: SpotEstimate | null; reason: DoneReason; progress: SolveStatus }
  | { status: "error"; key: string; error: SolverError };

/** Progress repaints at most this often, so a phone does not jank. */
const PROGRESS_MS = 250;

/**
 * Runs the Solver in a Web Worker, started on mount so the service worker caches its chunks.
 * Estimates the current Spot whenever `key` changes; solving only starts on `solve()`.
 */
export function useSolver(spot: Spot | null, key: string) {
  const clientRef = useRef<SolverClient | null>(null);
  const progressAtRef = useRef(0);
  const [estimate, setEstimate] = useState<{ key: string; result: EstimateResult } | null>(null);
  const [run, setRun] = useState<SolveRun>({ status: "idle" });

  useEffect(() => {
    const client = connectSolver(new Worker(new URL("./solver.worker.ts", import.meta.url), { type: "module" }));
    clientRef.current = client;
    return () => {
      client.dispose();
      clientRef.current = null;
    };
  }, []);

  useEffect(() => {
    const client = clientRef.current;
    if (!client || !spot) return;
    client.estimate(spot).then(
      (result) => {
        if (clientRef.current === client) setEstimate({ key, result });
      },
      (error: unknown) => {
        if (clientRef.current === client) setEstimate({ key, result: { error: solverErrorOf(error), ok: false } });
      },
    );
  }, [key]);

  const start = (solveKey: string, started: SpotEstimate | null, begin: (client: SolverClient, handlers: SolveHandlers) => Promise<SolveResult>) => {
    const client = clientRef.current;
    if (!client) return;
    const current = () => clientRef.current === client;
    let latest = started;
    progressAtRef.current = 0;
    setRun({ estimate: latest, key: solveKey, progress: null, status: "running" });
    begin(client, {
      onProgress: (status) => {
        const now = performance.now();
        if (!current() || now - progressAtRef.current < PROGRESS_MS) return;
        progressAtRef.current = now;
        setRun({ estimate: latest, key: solveKey, progress: status, status: "running" });
      },
      onStarted: (value) => {
        latest = value;
        if (current()) setRun({ estimate: value, key: solveKey, progress: null, status: "running" });
      },
    }).then(
      ({ reason, status }) => {
        if (current() && reason !== "superseded") setRun({ estimate: latest, key: solveKey, progress: status, reason, status: "done" });
      },
      (error: unknown) => {
        if (current()) setRun({ error: solverErrorOf(error), key: solveKey, status: "error" });
      },
    );
  };

  return {
    /** The estimate of the current Spot, or null while it is computed. */
    estimate: estimate && estimate.key === key ? estimate.result : null,
    run,
    solve() {
      if (spot) start(key, null, (client, handlers) => client.solve(spot, undefined, handlers));
    },
    /** Ends the solve after its slice; the strategy so far stays readable. */
    stop: () => clientRef.current?.stop(),
    /** Continues a stopped or capped solve, e.g. with a higher `maxIterations`. */
    resume(options?: SolveOptions) {
      if (run.status === "done") start(run.key, run.estimate, (client, handlers) => client.resume(options, handlers));
    },
    query: (path: readonly number[]): Promise<NodeView> => clientRef.current?.query(path) ?? Promise.reject(new SolverFailure({ code: "no-worker" })),
  };
}
