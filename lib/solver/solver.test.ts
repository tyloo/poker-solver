import { describe, expect, it } from "vitest";
import { COMBO_HI, COMBO_LO, HAND_CLASS_NAMES, parseCombo } from "@/lib/poker/combo";
import { evaluate } from "@/lib/poker/evaluator";
import { Solver } from "./solver";
import { board, spot } from "./test-helpers";

/** Mean probability of `action` over the given Combos at the node reached by `path`. */
function frequency(solver: Solver, path: number[], combos: string[], action: number): number {
  const view = solver.view(path);
  const player = view.player;
  if (player === null) throw new Error("Not a decision");
  const range = view.ranges[player];
  const strategy = range.strategy;
  if (!strategy) throw new Error("No strategy");
  const n = range.combos.length;
  let sum = 0;
  for (const text of combos) {
    const index = range.combos.indexOf(parseCombo(text) as number);
    if (index < 0) throw new Error(`${text} not in range`);
    sum += strategy[action * n + index];
  }
  return sum / combos.length;
}

describe("Kuhn poker", () => {
  // Three disjoint Combos play like Kuhn's J < Q < K: only an identical Combo is blocked,
  // so each player faces the other two with equal weight, and the board ranks KhQd < AsQc < AdKs.
  const KUHN = "KhQd, AsQc, AdKs";
  const kuhn = () => new Solver(spot({ betSizes: [0.5], board: "2c3d7h8sJc", effectiveStack: 1, ip: KUHN, oop: KUHN, pot: 2, raiseSizes: [] }));
  const J = ["KhQd"];
  const Q = ["AsQc"];
  const K = ["AdKs"];

  it("converges to the game value −1/18 for the first player", () => {
    const solver = kuhn();
    solver.iterate(1000);
    expect(solver.exploitability()).toBeLessThan(1e-3);
    const root = solver.view([]);
    expect(root.ranges[0].total.ev - 1).toBeCloseTo(-1 / 18, 3);
    expect(root.ranges[1].total.ev - 1).toBeCloseTo(1 / 18, 3);
  });

  it("finds the second player's unique strategy", () => {
    const solver = kuhn();
    solver.iterate(1000);
    // Facing a bet: fold J, call Q 1/3, call K.
    expect(frequency(solver, [1], J, 1)).toBeCloseTo(0, 2);
    expect(frequency(solver, [1], Q, 1)).toBeCloseTo(1 / 3, 2);
    expect(frequency(solver, [1], K, 1)).toBeCloseTo(1, 2);
    // After a check: bet J 1/3, check Q, bet K.
    expect(frequency(solver, [0], J, 1)).toBeCloseTo(1 / 3, 2);
    expect(frequency(solver, [0], Q, 1)).toBeCloseTo(0, 2);
    expect(frequency(solver, [0], K, 1)).toBeCloseTo(1, 2);
  });

  it("stays inside the first player's equilibrium family", () => {
    const solver = kuhn();
    solver.iterate(1000);
    const alpha = frequency(solver, [], J, 1);
    expect(alpha).toBeLessThanOrEqual(1 / 3 + 0.01);
    expect(frequency(solver, [], K, 1)).toBeCloseTo(3 * alpha, 2);
    expect(frequency(solver, [], Q, 1)).toBeCloseTo(0, 2);
    expect(frequency(solver, [0, 1], Q, 1)).toBeCloseTo(alpha + 1 / 3, 2);
    expect(frequency(solver, [0, 1], J, 1)).toBeCloseTo(0, 2);
    expect(frequency(solver, [0, 1], K, 1)).toBeCloseTo(1, 2);
  });
});

describe("river clairvoyance game", () => {
  // OOP holds the nuts (a set) or air, IP a bluff catcher; no card removal between the Ranges.
  const QQ = ["QhQd", "QhQc", "QdQc"];
  const AIR = ["6h5h", "6d5d", "6c5c"];
  const game = (betSize: number) =>
    new Solver(spot({ betSizes: [betSize], board: "Qs Jh 7d 4c 2s", effectiveStack: 100 * betSize, ip: "KK", oop: [...QQ, ...AIR].join(","), pot: 100 }));

  for (const [betSize, call, bluff, ev] of [
    [1, 0.5, 0.5, 75],
    [0.5, 2 / 3, 1 / 3, 200 / 3],
  ]) {
    it(`bluffs and calls at the closed-form frequencies for a ${betSize * 100}% pot bet`, () => {
      const solver = game(betSize);
      solver.iterate(3000);
      expect(solver.exploitability()).toBeLessThan(0.05);
      expect(frequency(solver, [], QQ, 1)).toBeCloseTo(1, 2);
      expect(frequency(solver, [], AIR, 1)).toBeCloseTo(bluff, 2);
      expect(frequency(solver, [1], ["KsKh"], 1)).toBeCloseTo(call, 2);
      const root = solver.view([]);
      expect(Math.abs(root.ranges[0].total.ev - ev)).toBeLessThan(0.5);
      expect(Math.abs(root.ranges[1].total.ev - (100 - ev))).toBeLessThan(0.5);
      const qq = HAND_CLASS_NAMES.indexOf("QQ");
      expect(Math.abs(root.ranges[0].handClasses.ev[qq] - (100 + call * 100 * betSize))).toBeLessThan(0.5);
    });
  }
});

describe("chance nodes", () => {
  const turn = "Kd 9s 6c 2h";
  const oop = "TT+, AQs+, KJs, QJs, JTs, 98s, AKo";
  const ip = "99-22, ATs-A2s, KTs+, Q9s+, T9s, 87s, 76s, AQo-ATo, KQo";

  it("give every hand pot × equity on a check-down turn, matching enumeration", () => {
    const solver = new Solver(spot({ board: turn, effectiveStack: 0, ip, oop, pot: 100 }));
    const view = solver.view([]);
    const cards = board(turn);
    for (const player of [0, 1] as const) {
      const own = view.ranges[player];
      const opp = view.ranges[player === 0 ? 1 : 0];
      for (let h = 0; h < own.combos.length; h += 7) {
        const a = own.combos[h];
        let share = 0;
        let count = 0;
        for (let river = 0; river < 52; river++) {
          if (cards.includes(river) || river === COMBO_HI[a] || river === COMBO_LO[a]) continue;
          const mine = evaluate([...cards, river, COMBO_HI[a], COMBO_LO[a]]);
          for (const b of opp.combos) {
            const used = [river, COMBO_HI[a], COMBO_LO[a]];
            if (used.includes(COMBO_HI[b]) || used.includes(COMBO_LO[b])) continue;
            const theirs = evaluate([...cards, river, COMBO_HI[b], COMBO_LO[b]]);
            share += mine > theirs ? 1 : mine === theirs ? 0.5 : 0;
            count++;
          }
        }
        expect(own.equity[h]).toBeCloseTo(share / count, 9);
        expect(own.ev[h]).toBeCloseTo((100 * share) / count, 7);
      }
    }
    expect(view.ranges[0].total.ev + view.ranges[1].total.ev).toBeCloseTo(100, 9);
  });

  it("let the view walk through a dealt river card", () => {
    const solver = new Solver(spot({ board: turn, ip, oop, pot: 100 }));
    solver.iterate(5);
    const chance = solver.view([0, 0]);
    expect(chance.kind).toBe("chance");
    expect(chance.cards).toHaveLength(48);
    const card = chance.cards.indexOf(board("As")[0]);
    const river = solver.view([0, 0, card]);
    expect(river.kind).toBe("action");
    expect(river.board).toEqual([...board(turn), board("As")[0]]);
    const aceCombos = Array.from(river.ranges[0].combos, (combo, index) => (COMBO_HI[combo] === board("As")[0] ? index : -1)).filter((index) => index >= 0);
    expect(aceCombos.length).toBeGreaterThan(0);
    for (const index of aceCombos) expect(river.ranges[0].reach[index]).toBe(0);
    expect(() => solver.view([0, 0, 48])).toThrow(/path/i);
  });
});

describe("solving a realistic river Spot", () => {
  const river = () =>
    new Solver(
      spot({
        board: "Kd 9s 6c 2h 2d",
        effectiveStack: 300,
        ip: "99-22, ATs-A2s, KTs+, Q9s+, J9s+, T9s, 87s, 76s, 65s, AQo-ATo, KJo+",
        oop: "TT+, AQs+, KJs+, QJs, JTs, 98s, AKo, KQo",
        pot: 100,
      }),
    );

  it("drives exploitability under 0.5% of the pot", () => {
    const solver = river();
    const start = solver.exploitability();
    solver.iterate(50);
    const middle = solver.exploitability();
    solver.iterate(250);
    const end = solver.exploitability();
    expect(middle).toBeLessThan(start);
    expect(end).toBeLessThan(middle);
    expect(end).toBeLessThan(0.5);
  });

  it("keeps a normalized average strategy and consistent hand-class summaries", () => {
    const solver = river();
    solver.iterate(20);
    for (const path of [[], [1], [0], [0, 2]]) {
      const view = solver.view(path);
      const player = view.player as 0 | 1;
      const range = view.ranges[player];
      const strategy = range.strategy as Float64Array;
      const n = range.combos.length;
      for (let h = 0; h < n; h++) {
        let sum = 0;
        for (let a = 0; a < view.actions.length; a++) sum += strategy[a * n + h];
        expect(sum).toBeCloseTo(1, 9);
      }
      const classes = range.handClasses;
      const total = classes.combos.reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(range.total.combos, 9);
      expect(total).toBeCloseTo(
        range.reach.reduce((a, b) => a + b, 0),
        9,
      );
    }
  });
});
