import { SolverFailure } from "./errors";
import type { EstimateResult, SpotEstimate } from "./estimate";
import type { DoneReason, SolveOptions, SolverRequest, SolverResponse, SolveStatus } from "./protocol";
import type { NodeView } from "./solver";
import type { Spot } from "./spot";

/** A Worker, or anything shaped like one (tests run the host in-process). */
export type SolverPort = {
  postMessage(message: SolverRequest): void;
  addEventListener(type: "message", listener: (event: MessageEvent<SolverResponse>) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent<SolverResponse>) => void): void;
  terminate?(): void;
};

/** "superseded" means a newer `solve` replaced this one. */
export type SolveResult = { reason: DoneReason | "superseded"; status: SolveStatus };

export type SolveHandlers = {
  onStarted?: (estimate: SpotEstimate) => void;
  /** About every 50 ms of solving, or every iteration when iterations are slower. */
  onProgress?: (status: SolveStatus) => void;
};

export type SolverClient = {
  /** Tree size and memory for a Spot, without solving, against a memory budget (the solve refuses Spots over it). */
  estimate(spot: Spot, budgetBytes?: number): Promise<EstimateResult>;
  /**
   * Builds the tree and solves until the target, the iteration cap or `stop()`. Rejects with a `SolverFailure`, e.g. on an
   * invalid Spot or one over `budgetBytes`.
   */
  solve(spot: Spot, options?: SolveOptions, handlers?: SolveHandlers, budgetBytes?: number): Promise<SolveResult>;
  /** Ends the current solve after its slice; the strategy so far stays queryable. */
  stop(): void;
  /** Continues the last solve, e.g. with a higher `maxIterations` or a lower target. */
  resume(options?: SolveOptions, handlers?: SolveHandlers): Promise<SolveResult>;
  /** A node of the last solve by path (action indexes, and card indexes at chance nodes), from the current strategy. */
  query(path: readonly number[]): Promise<NodeView>;
  dispose(): void;
};

type Pending<T> = { resolve: (value: T) => void; reject: (error: SolverFailure) => void };

export function connectSolver(port: SolverPort): SolverClient {
  let solveId = 0;
  let requestId = 0;
  let active: (Pending<SolveResult> & { solveId: number; handlers: SolveHandlers }) | null = null;
  const requests = new Map<number, Pending<EstimateResult> | Pending<NodeView>>();

  const listener = ({ data: message }: MessageEvent<SolverResponse>) => {
    if (message.type === "estimate" || message.type === "node" || (message.type === "error" && message.requestId !== undefined)) {
      const id = message.requestId as number;
      const pending = requests.get(id);
      requests.delete(id);
      if (!pending) return;
      if (message.type === "estimate") (pending as Pending<EstimateResult>).resolve(message.result);
      else if (message.type === "node") (pending as Pending<NodeView>).resolve(message.node);
      else pending.reject(new SolverFailure(message.error));
      return;
    }
    if (!active || message.solveId !== active.solveId) return;
    const current = active;
    if (message.type === "started") current.handlers.onStarted?.(message.estimate);
    else if (message.type === "progress") current.handlers.onProgress?.(message.status);
    else if (message.type === "done" || message.type === "error") {
      active = null;
      if (message.type === "done") current.resolve({ reason: message.reason, status: message.status });
      else current.reject(new SolverFailure(message.error));
    }
  };
  port.addEventListener("message", listener);

  const track = (id: number, handlers: SolveHandlers) => {
    const previous = active;
    const result = new Promise<SolveResult>((resolve, reject) => {
      active = { handlers, reject, resolve, solveId: id };
    });
    previous?.resolve({ reason: "superseded", status: { elapsedMs: 0, exploitability: null, exploitabilityShare: null, iteration: 0 } });
    return result;
  };

  const request = <T>(build: (id: number) => SolverRequest) =>
    new Promise<T>((resolve, reject) => {
      const id = ++requestId;
      requests.set(id, { reject, resolve } as Pending<EstimateResult> | Pending<NodeView>);
      port.postMessage(build(id));
    });

  return {
    dispose() {
      port.removeEventListener("message", listener);
      port.terminate?.();
    },
    estimate: (spot, budgetBytes) => request<EstimateResult>((id) => ({ budgetBytes, requestId: id, spot, type: "estimate" })),
    query(path) {
      if (solveId === 0) return Promise.reject(new SolverFailure({ code: "not-started" }));
      const id = solveId;
      return request<NodeView>((requestId) => ({ path: [...path], requestId, solveId: id, type: "query" }));
    },
    resume(options, handlers = {}) {
      if (solveId === 0) return Promise.reject(new SolverFailure({ code: "no-solve" }));
      if (active) return Promise.reject(new SolverFailure({ code: "still-running" }));
      const result = track(solveId, handlers);
      port.postMessage({ options, solveId, type: "resume" });
      return result;
    },
    solve(spot, options, handlers = {}, budgetBytes) {
      const id = ++solveId;
      const result = track(id, handlers);
      port.postMessage({ budgetBytes, options, solveId: id, spot, type: "solve" });
      return result;
    },
    stop() {
      if (active) port.postMessage({ solveId: active.solveId, type: "stop" });
    },
  };
}
