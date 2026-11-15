import { describe, expect, it } from "vitest";
import { Solver } from "./solver";
import { type spot as makeSpot, spot } from "./test-helpers";

// Reference Spots for convergence measurements.
// Run with `SOLVER_BENCH=1 pnpm vitest run lib/solver/benchmark.test.ts`. 1bb = 100 chips.
const BTN = "22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o+, K8o+, Q9o+, J9o+, T9o";
const BB = "22-99, A2s-AJs, K2s-KJs, Q6s+, J7s+, T7s+, 97s+, 86s+, 75s+, 64s+, 54s, A2o-AJo, K9o-KJo, QTo+, JTo, T9o";

const SPOTS: [string, Parameters<typeof makeSpot>[0]][] = [
  ["River, BB vs BTN, pot 11bb, 12bb behind", { board: "Kd 9s 6c 2h 7d", effectiveStack: 1200, ip: BTN, oop: BB, pot: 1100 }],
  ["Turn, BB vs BTN 20bb, pot 4.5bb, 18bb behind", { board: "Kd 9s 6c 2h", effectiveStack: 1800, ip: BTN, oop: BB, pot: 450 }],
  ["Turn, BB vs BTN 40bb, pot 5.5bb, 37.5bb behind", { board: "Kd 9s 6c 2h", effectiveStack: 3750, ip: BTN, oop: BB, pot: 550 }],
  [
    "Flop, 75% + all-in, narrowed Ranges, pot 5bb, 7.5bb behind",
    {
      betSizes: [0.75],
      board: "Kd 9s 6c",
      effectiveStack: 750,
      ip: "22+, A2s+, K9s+, Q9s+, J9s+, T9s, 98s, ATo+, KJo+",
      oop: "22-99, A2s-AJs, K9s-KJs, Q9s+, J9s+, T9s, 98s, 87s, ATo-AJo, KJo+, QJo",
      pot: 500,
    },
  ],
];

describe.skipIf(!process.env.SOLVER_BENCH)("solver benchmark", () => {
  for (const [name, fields] of SPOTS) {
    it(name, () => {
      const built = performance.now();
      const solver = new Solver(spot(fields));
      const buildMs = performance.now() - built;
      const target = solver.spot.pot * 0.005;
      const start = performance.now();
      let exploitability = Number.POSITIVE_INFINITY;
      let checkMs = 0;
      while (solver.iteration < 2000) {
        solver.iterate(10);
        const checked = performance.now();
        exploitability = solver.exploitability();
        checkMs += performance.now() - checked;
        if (exploitability <= target) break;
      }
      const totalMs = performance.now() - start;
      const { estimate } = solver;
      console.log(
        [
          name,
          `combos ${estimate.combos.join("/")}, ${estimate.actionNodes} action nodes, estimate ${(estimate.memoryBytes / 2 ** 20).toFixed(1)} MB`,
          `build ${buildMs.toFixed(0)} ms, ${solver.iteration} iterations to ${((100 * exploitability) / solver.spot.pot).toFixed(3)}% pot`,
          `${totalMs.toFixed(0)} ms total (${((totalMs - checkMs) / solver.iteration).toFixed(1)} ms/iteration, exploitability checks ${checkMs.toFixed(0)} ms)`,
        ].join("\n  "),
      );
      expect(exploitability).toBeLessThanOrEqual(target);
    }, 600_000);
  }
});
