import { describe, expect, it } from "vitest";
import { SolverFailure } from "./errors";
import { estimateSpot, MEMORY_BUDGET_BYTES, overBudget } from "./estimate";
import { Solver } from "./solver";
import { spot } from "./test-helpers";

const WIDE = "22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o+, K8o+, Q9o+, J9o+, T9o";
const NARROW = "TT+, AQs+, AKo";

describe("estimateSpot", () => {
  it("counts the tree, the live Combos and the storage before solving", () => {
    const river = spot({ board: "Kd 9s 6c 2h 2d", effectiveStack: 300, ip: NARROW, oop: "QQ+" });
    const result = estimateSpot(river);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const { estimate } = result;
    expect(estimate.combos).toEqual([15, 43]);
    expect(estimate.fits).toBe(true);
    expect(estimate.budgetBytes).toBe(MEMORY_BUDGET_BYTES);
    const solver = new Solver(river);
    expect(estimate.actionNodes).toBe(solver.tree.stats.actionNodes);
    const storage = (estimate.actionSlots[0] * 15 + estimate.actionSlots[1] * 43) * 8;
    expect(estimate.memoryBytes).toBeGreaterThan(storage);
  });

  it("refuses a wide flop Spot over the budget", () => {
    const flop = spot({ betSizes: [0.75], board: "Kd 9s 6c", effectiveStack: 1750, ip: WIDE, oop: WIDE, pot: 550 });
    const result = estimateSpot(flop);
    expect(result.ok && result.estimate.fits).toBe(false);
    expect(() => new Solver(flop)).toThrow(SolverFailure);
  });

  it("scales with the Ranges, so narrowing them can bring a flop Spot under budget", () => {
    const flop = (range: string) => spot({ betSizes: [0.75], board: "Kd 9s 6c", effectiveStack: 1750, ip: range, oop: range, pot: 550 });
    const wide = estimateSpot(flop(WIDE));
    const narrow = estimateSpot(flop(NARROW));
    if (!wide.ok || !narrow.ok) throw new Error("invalid");
    expect(narrow.estimate.memoryBytes).toBeLessThan(wide.estimate.memoryBytes / 4);
    expect(narrow.estimate.fits).toBe(true);
  });

  it("reports an invalid Spot instead of an estimate", () => {
    expect(estimateSpot(spot({ board: "Kd 9s", ip: NARROW, oop: NARROW }))).toEqual({ error: { code: "spot", problem: { code: "board-cards" } }, ok: false });
  });
});

describe("overBudget", () => {
  const over = (target: ReturnType<typeof spot>) => {
    const result = estimateSpot(target, 1);
    if (!result.ok || result.estimate.fits) throw new Error("expected an over-budget estimate");
    return overBudget(result.estimate, target);
  };

  it("offers only what the setup can change: narrower ranges, fewer bet sizes, a later street", () => {
    expect(over(spot({ board: "Kd 9s 6c 2h", ip: NARROW, oop: NARROW }))).toMatchObject({ betSize: true, budgetBytes: 1, code: "over-budget", laterStreet: true });
    expect(over(spot({ betSizes: [0.75], board: "Kd 9s 6c", ip: NARROW, oop: NARROW }))).toMatchObject({ betSize: false, laterStreet: true });
    expect(over(spot({ betSizes: [0.75], board: "Kd 9s 6c 2h 2d", ip: NARROW, oop: NARROW }))).toMatchObject({ betSize: false, laterStreet: false });
  });

  it("is the error the engine refuses with", () => {
    const flop = spot({ betSizes: [0.75], board: "Kd 9s 6c", effectiveStack: 1750, ip: WIDE, oop: WIDE, pot: 550 });
    const result = estimateSpot(flop);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const refusal = (() => {
      try {
        new Solver(flop);
      } catch (error) {
        return error;
      }
    })();
    expect(refusal).toBeInstanceOf(SolverFailure);
    expect((refusal as SolverFailure).error).toEqual(overBudget(result.estimate, flop));
    expect((refusal as SolverFailure).error).toMatchObject({ code: "over-budget", memoryBytes: result.estimate.memoryBytes });
  });
});
