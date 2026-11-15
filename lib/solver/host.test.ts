import { describe, expect, it } from "vitest";
import { createSolverHost } from "./host";
import type { SolverRequest, SolverResponse } from "./protocol";
import { spot } from "./test-helpers";

const KUHN = "KhQd, AsQc, AdKs";
const kuhn = () => spot({ betSizes: [0.5], board: "2c3d7h8sJc", effectiveStack: 1, ip: KUHN, oop: KUHN, pot: 2, raiseSizes: [] });
const river = () => spot({ board: "Kd 9s 6c 2h 2d", effectiveStack: 300, ip: "99-22, ATs-A2s, KTs+, Q9s+, T9s, AQo-ATo, KJo+", oop: "TT+, AQs+, KJs+, AKo", pot: 100 });

function harness(sliceMs = 5) {
  const messages: SolverResponse[] = [];
  const waiters: { match: (message: SolverResponse) => boolean; resolve: (message: SolverResponse) => void }[] = [];
  const host = createSolverHost(
    (message) => {
      messages.push(message);
      for (const waiter of waiters.splice(0)) {
        if (waiter.match(message)) waiter.resolve(message);
        else waiters.push(waiter);
      }
    },
    { sliceMs },
  );
  const next = <T extends SolverResponse["type"]>(type: T, match: (message: Extract<SolverResponse, { type: T }>) => boolean = () => true) =>
    new Promise<Extract<SolverResponse, { type: T }>>((resolve) => {
      waiters.push({ match: (message) => message.type === type && match(message as Extract<SolverResponse, { type: T }>), resolve: resolve as (message: SolverResponse) => void });
    });
  const send = (request: SolverRequest) => host.handle(request);
  return { messages, next, send };
}

describe("solver host", () => {
  it("estimates a Spot without solving it", async () => {
    const { next, send } = harness();
    const reply = next("estimate");
    send({ requestId: 7, spot: river(), type: "estimate" });
    const message = await reply;
    expect(message.requestId).toBe(7);
    expect(message.result.ok && message.result.estimate.fits).toBe(true);
  });

  it("solves to the target, reporting the estimate, progress and the result", async () => {
    const { messages, next, send } = harness(0);
    const done = next("done");
    send({ options: { targetExploitability: 0.001 }, solveId: 1, spot: kuhn(), type: "solve" });
    const message = await done;
    expect(message.reason).toBe("converged");
    expect(message.status.exploitabilityShare).toBeLessThanOrEqual(0.001);
    expect(message.status.iteration % 10).toBe(0);
    expect(messages[0]).toMatchObject({ solveId: 1, type: "started" });
    expect(messages.some((m) => m.type === "progress")).toBe(true);

    const node = next("node");
    send({ path: [1], requestId: 3, solveId: 1, type: "query" });
    const view = (await node).node;
    expect(view.player).toBe(1);
    expect(view.actions.map((action) => action.kind)).toEqual(["fold", "call"]);
  });

  it("stops at the iteration cap", async () => {
    const { next, send } = harness();
    const done = next("done");
    send({ options: { checkEvery: 7, maxIterations: 12, targetExploitability: 0 }, solveId: 1, spot: kuhn(), type: "solve" });
    const message = await done;
    expect(message.reason).toBe("max-iterations");
    expect(message.status.iteration).toBe(12);
    expect(message.status.exploitability).not.toBeNull();
  });

  it("stops early on request, answers queries from the snapshot, then resumes", async () => {
    const { next, send } = harness();
    const progress = next("progress");
    send({ options: { maxIterations: 100_000, targetExploitability: 0 }, solveId: 4, spot: river(), type: "solve" });
    await progress;
    const stopped = next("done");
    send({ solveId: 4, type: "stop" });
    const stop = await stopped;
    expect(stop.reason).toBe("stopped");
    expect(stop.status.exploitability).not.toBeNull();

    const node = next("node");
    send({ path: [], requestId: 1, solveId: 4, type: "query" });
    const view = (await node).node;
    const range = view.ranges[0];
    const strategy = range.strategy as Float64Array;
    const n = range.combos.length;
    for (let h = 0; h < n; h++) {
      let sum = 0;
      for (let a = 0; a < view.actions.length; a++) sum += strategy[a * n + h];
      expect(sum).toBeCloseTo(1, 9);
    }

    const resumed = next("done");
    send({ options: { maxIterations: stop.status.iteration + 20 }, solveId: 4, type: "resume" });
    const end = await resumed;
    expect(end.reason).toBe("max-iterations");
    expect(end.status.iteration).toBe(stop.status.iteration + 20);
  });

  it("drops a superseded solve without reporting it", async () => {
    const { messages, next, send } = harness();
    send({ options: { maxIterations: 100_000, targetExploitability: 0 }, solveId: 1, spot: river(), type: "solve" });
    const done = next("done");
    send({ solveId: 2, spot: kuhn(), type: "solve" });
    expect((await done).solveId).toBe(2);
    expect(messages.some((m) => m.type === "done" && m.solveId === 1)).toBe(false);
    const error = next("error");
    send({ path: [], requestId: 9, solveId: 1, type: "query" });
    expect(await error).toMatchObject({ requestId: 9, solveId: 1 });
  });

  it("reports invalid Spots and paths as errors", async () => {
    const { next, send } = harness();
    const invalid = next("error");
    send({ solveId: 1, spot: { ...kuhn(), pot: 0 }, type: "solve" });
    expect((await invalid).message).toMatch(/pot/);

    const done = next("done");
    send({ solveId: 2, spot: kuhn(), type: "solve" });
    await done;
    const badPath = next("error");
    send({ path: [5], requestId: 2, solveId: 2, type: "query" });
    expect(await badPath).toMatchObject({ message: expect.stringMatching(/path/), requestId: 2, solveId: 2 });
  });
});
