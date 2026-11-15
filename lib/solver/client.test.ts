import { describe, expect, it } from "vitest";
import { connectSolver, type SolverPort } from "./client";
import { createSolverHost } from "./host";
import type { SolverRequest, SolverResponse, SolveStatus } from "./protocol";
import { spot } from "./test-helpers";

const KUHN = "KhQd, AsQc, AdKs";
const kuhn = () => spot({ betSizes: [0.5], board: "2c3d7h8sJc", effectiveStack: 1, ip: KUHN, oop: KUHN, pot: 2, raiseSizes: [] });
const river = () => spot({ board: "Kd 9s 6c 2h 2d", effectiveStack: 300, ip: "99-22, ATs-A2s, KTs+, Q9s+, T9s, AQo-ATo, KJo+", oop: "TT+, AQs+, KJs+, AKo", pot: 100 });

/** A port that runs the host in-process, delivering messages asynchronously like a worker. */
function inProcessPort(): SolverPort & { terminated: boolean } {
  const listeners = new Set<(event: MessageEvent<SolverResponse>) => void>();
  const host = createSolverHost((message) => {
    queueMicrotask(() => {
      for (const listener of listeners) listener({ data: structuredClone(message) } as MessageEvent<SolverResponse>);
    });
  });
  return {
    addEventListener: (_type, listener) => listeners.add(listener),
    postMessage: (message: SolverRequest) => setTimeout(() => host.handle(structuredClone(message)), 0),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    terminate() {
      this.terminated = true;
    },
    terminated: false,
  };
}

describe("solver client", () => {
  it("estimates, solves with progress, and reads nodes", async () => {
    const client = connectSolver(inProcessPort());
    const estimate = await client.estimate(kuhn());
    expect(estimate.ok && estimate.estimate.actionNodes).toBe(4);

    const progress: SolveStatus[] = [];
    let started = false;
    const result = await client.solve(kuhn(), { targetExploitability: 0.001 }, { onProgress: (status) => progress.push(status), onStarted: () => (started = true) });
    expect(started).toBe(true);
    expect(result.reason).toBe("converged");
    expect(result.status.exploitabilityShare).toBeLessThanOrEqual(0.001);

    const [root, facing] = await Promise.all([client.query([]), client.query([1])]);
    expect(root.player).toBe(0);
    expect(facing.actions.map((action) => action.kind)).toEqual(["fold", "call"]);
    await expect(client.query([9])).rejects.toMatchObject({ error: { code: "bad-path", step: 1 } });
  });

  it("stops, resumes and reports a superseded solve", async () => {
    const client = connectSolver(inProcessPort());
    let stopSent = false;
    const first = client.solve(
      river(),
      { maxIterations: 100_000, targetExploitability: 0 },
      {
        onProgress: () => {
          if (!stopSent) client.stop();
          stopSent = true;
        },
      },
    );
    const stopped = await first;
    expect(stopped.reason).toBe("stopped");
    const more = await client.resume({ maxIterations: stopped.status.iteration + 5 });
    expect(more).toMatchObject({ reason: "max-iterations", status: { iteration: stopped.status.iteration + 5 } });

    const long = client.solve(river(), { maxIterations: 100_000, targetExploitability: 0 });
    const short = client.solve(kuhn());
    expect((await long).reason).toBe("superseded");
    expect((await short).reason).toBe("converged");
  });

  it("rejects an invalid Spot and terminates the worker on dispose", async () => {
    const port = inProcessPort();
    const client = connectSolver(port);
    await expect(client.solve({ ...kuhn(), pot: -1 })).rejects.toMatchObject({ error: { code: "spot", problem: { code: "pot" } } });
    await expect(client.query([])).rejects.toMatchObject({ error: { code: "solve-gone" } });
    client.dispose();
    expect(port.terminated).toBe(true);
  });
});
