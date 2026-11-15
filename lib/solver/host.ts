import { solverErrorOf } from "./errors";
import { estimateSpot } from "./estimate";
import { DEFAULT_SOLVE_OPTIONS, type DoneReason, type SolveOptions, type SolverRequest, type SolverResponse, type SolveStatus } from "./protocol";
import { type NodeView, Solver } from "./solver";

export type Post = (message: SolverResponse, transfer?: Transferable[]) => void;

export type HostOptions = {
  /** Work between yields, so stop and query messages get through. Default 50 ms. */
  sliceMs?: number;
  now?: () => number;
  yieldControl?: () => Promise<void>;
};

type Job = {
  solveId: number;
  solver: Solver;
  options: Required<SolveOptions>;
  running: boolean;
  stopRequested: boolean;
  elapsedMs: number;
  exploitability: number | null;
  measuredAt: number;
};

function buffers(node: NodeView): Transferable[] {
  const list: Transferable[] = [];
  for (const range of node.ranges) {
    for (const array of [range.combos, range.reach, range.ev, range.equity, range.strategy, ...Object.values(range.handClasses)]) {
      if (array) list.push(array.buffer as ArrayBuffer);
    }
  }
  return list;
}

/** The worker side of the protocol, free of worker globals so it runs under Vitest. */
export function createSolverHost(
  post: Post,
  { sliceMs = 50, now = () => performance.now(), yieldControl = () => new Promise((resolve) => setTimeout(resolve, 0)) }: HostOptions = {},
) {
  let job: Job | null = null;

  const status = (current: Job): SolveStatus => ({
    elapsedMs: current.elapsedMs,
    exploitability: current.exploitability,
    exploitabilityShare: current.exploitability === null ? null : current.exploitability / current.solver.spot.pot,
    iteration: current.solver.iteration,
  });

  const measure = (current: Job) => {
    if (current.measuredAt === current.solver.iteration && current.exploitability !== null) return current.exploitability;
    current.exploitability = current.solver.exploitability();
    current.measuredAt = current.solver.iteration;
    return current.exploitability;
  };

  const finish = (current: Job, reason: DoneReason) => {
    measure(current);
    current.running = false;
    post({ reason, solveId: current.solveId, status: status(current), type: "done" });
  };

  async function run(current: Job) {
    current.running = true;
    current.stopRequested = false;
    const { solver, options } = current;
    const target = options.targetExploitability * solver.spot.pot;
    while (job === current) {
      if (current.stopRequested) return finish(current, "stopped");
      const sliceStart = now();
      let reason: DoneReason | null = null;
      do {
        if (solver.iteration >= options.maxIterations) {
          reason = measure(current) <= target ? "converged" : "max-iterations";
          break;
        }
        solver.iterate(1);
        if (solver.iteration % options.checkEvery === 0 && measure(current) <= target) reason = "converged";
      } while (!reason && now() - sliceStart < sliceMs);
      current.elapsedMs += now() - sliceStart;
      if (reason) return finish(current, reason);
      post({ solveId: current.solveId, status: status(current), type: "progress" });
      await yieldControl();
    }
  }

  const start = (current: Job) =>
    run(current).catch((error: unknown) => {
      current.running = false;
      post({ error: solverErrorOf(error), solveId: current.solveId, type: "error" });
    });

  function handle(request: SolverRequest): void {
    switch (request.type) {
      case "estimate":
        post({ requestId: request.requestId, result: estimateSpot(request.spot), type: "estimate" });
        return;
      case "solve": {
        job = null;
        let solver: Solver;
        try {
          solver = new Solver(request.spot);
        } catch (error) {
          post({ error: solverErrorOf(error), solveId: request.solveId, type: "error" });
          return;
        }
        const current: Job = {
          elapsedMs: 0,
          exploitability: null,
          measuredAt: -1,
          options: { ...DEFAULT_SOLVE_OPTIONS, ...request.options },
          running: false,
          solveId: request.solveId,
          solver,
          stopRequested: false,
        };
        job = current;
        post({ estimate: solver.estimate, solveId: request.solveId, type: "started" });
        start(current);
        return;
      }
      case "stop":
        if (job?.solveId === request.solveId && job.running) job.stopRequested = true;
        return;
      case "resume":
        if (job?.solveId !== request.solveId) {
          post({ error: { code: "no-solve" }, solveId: request.solveId, type: "error" });
          return;
        }
        if (job.running) return;
        job.options = { ...job.options, ...request.options };
        start(job);
        return;
      case "query": {
        const { requestId, solveId } = request;
        if (job?.solveId !== solveId) {
          post({ error: { code: "solve-gone" }, requestId, solveId, type: "error" });
          return;
        }
        try {
          const node = job.solver.view(request.path);
          post({ node, requestId, solveId, type: "node" }, buffers(node));
        } catch (error) {
          post({ error: solverErrorOf(error), requestId, solveId, type: "error" });
        }
      }
    }
  }

  return { handle };
}
