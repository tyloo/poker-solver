import { describe, expect, it } from "vitest";
import { HAND_CLASS_COUNT, handClassCombos } from "@/lib/poker/combo";
import type { EquityMatrix } from "./equity-matrix";
import { matchupWeights } from "./equity-matrix";
import { callGains, foldedTo, pushGains, solvePushFold } from "./nash";

const N = HAND_CLASS_COUNT;
const weight = matchupWeights();
const filled = (value: number) => new Float64Array(N).fill(value);

/** Every matchup a coin flip. */
const coinFlips: EquityMatrix = { equity: new Float64Array(N * N).fill(0.5), weight };

/** A toy deck where a lower HandClassId is stronger: up to 95% against the weakest class. */
const ladder: EquityMatrix = {
  equity: Float64Array.from({ length: N * N }, (_, k) => 0.5 + (0.45 * ((k % N) - Math.floor(k / N))) / (N - 1)),
  weight,
};

describe("foldedTo", () => {
  it("lists the players behind the pusher in acting order", () => {
    expect(foldedTo("UTG", 10).callers).toEqual(["UTG+1", "LJ", "HJ", "CO", "BTN", "SB", "BB"]);
    expect(foldedTo("SB", 10).callers).toEqual(["BB"]);
  });

  it("refuses the BB, which is never folded to", () => {
    expect(() => foldedTo("BB", 10)).toThrow();
  });
});

describe("pushGains", () => {
  it("is +1.5bb with a fold behind and +0.5bb into a coin flip for the SB", () => {
    const game = foldedTo("SB", 10);
    expect(pushGains(coinFlips, game, [filled(0)])[0]).toBeCloseTo(1.5, 12);
    expect(pushGains(coinFlips, game, [filled(1)])[0]).toBeCloseTo(0.5, 12);
  });

  it("adds the dead blinds to the pot of the first caller", () => {
    const game = foldedTo("UTG", 10);
    const none = game.callers.map(() => filled(0));
    expect(pushGains(coinFlips, game, none)[50]).toBeCloseTo(1.5, 12);
    // Only the BB calls: pot 2S + 0.5 (the SB's blind).
    expect(pushGains(coinFlips, game, [...none.slice(0, -1), filled(1)])[50]).toBeCloseTo(0.5 * 20.5 - 10, 12);
    // The SB calls first, so the BB folds: pot 2S + 1.
    expect(pushGains(coinFlips, game, [...none.slice(0, -2), filled(1), filled(1)])[50]).toBeCloseTo(0.5 * 21 - 10, 12);
  });

  it("weights each caller by the chance everyone before them folded", () => {
    const game = foldedTo("BTN", 10);
    // SB calls half its hands, BB always: half the time the SB's coin flip, else the BB's.
    const expected = 0.5 * (0.5 * 21 - 10) + 0.5 * (0.5 * 20.5 - 10);
    expect(pushGains(coinFlips, game, [filled(0.5), filled(1)])[0]).toBeCloseTo(expected, 12);
  });

  it("removes the pusher's cards from the callers' ranges", () => {
    // The BB calls only with AA (HandClassId 0). Holding an ace, the pusher sees it half as often.
    const game = foldedTo("SB", 10);
    const aaOnly = filled(0);
    aaOnly[0] = 1;
    const withAce = pushGains(coinFlips, game, [aaOnly])[1]; // AKs
    const withoutAce = pushGains(coinFlips, game, [aaOnly])[14]; // KK
    const callChance = (blockers: number) => blockers / 1225;
    expect(withoutAce).toBeCloseTo(1.5 - callChance(6) * 1, 12);
    expect(withAce).toBeCloseTo(1.5 - callChance(3) * 1, 12);
  });
});

describe("callGains", () => {
  it("compares calling the push with folding the blind", () => {
    expect(callGains(coinFlips, foldedTo("SB", 10), 0, filled(1))[0]).toBeCloseTo(1, 12);
    const fromUtg = foldedTo("UTG", 10);
    expect(callGains(coinFlips, fromUtg, fromUtg.callers.indexOf("BB"), filled(1))[0]).toBeCloseTo(0.5 * 20.5 - 10 + 1, 12);
    expect(callGains(coinFlips, fromUtg, fromUtg.callers.indexOf("SB"), filled(1))[0]).toBeCloseTo(0.5 * 21 - 10 + 0.5, 12);
    expect(callGains(coinFlips, fromUtg, fromUtg.callers.indexOf("CO"), filled(1))[0]).toBeCloseTo(0.5 * 21.5 - 10, 12);
  });

  it("calls everything for free at 1bb in the BB", () => {
    const gains = callGains(ladder, foldedTo("SB", 1), 0, filled(1));
    for (let j = 0; j < N; j++) expect(gains[j]).toBeGreaterThan(0);
  });
});

describe("solvePushFold", () => {
  const combos = (strategy: Float64Array) => strategy.reduce((sum, f, cls) => sum + f * handClassCombos(cls).length, 0);

  it("reaches an equilibrium: neither side gains by deviating", () => {
    for (const game of [foldedTo("SB", 8), foldedTo("CO", 6)]) {
      const solution = solvePushFold(ladder, game, 3000);
      expect(solution.gaps.pusher).toBeLessThan(1e-4);
      for (const gap of solution.gaps.callers) expect(gap).toBeLessThan(1e-4);
    }
  });

  it("plays the strongest hands and folds the weakest on the ladder", () => {
    const { push, calls } = solvePushFold(ladder, foldedTo("BTN", 10), 3000);
    for (const strategy of [push, ...calls]) {
      expect(strategy[0]).toBe(1);
      expect(strategy[N - 1]).toBeLessThan(0.01);
    }
    // Callers need a stronger range than the pusher, and the BB (with a blind in) calls wider than the SB.
    expect(combos(calls[1])).toBeLessThan(combos(push));
    expect(combos(calls[1])).toBeGreaterThan(combos(calls[0]));
  });

  it("is deterministic", () => {
    const a = solvePushFold(ladder, foldedTo("HJ", 7), 500);
    const b = solvePushFold(ladder, foldedTo("HJ", 7), 500);
    expect(Array.from(a.push)).toEqual(Array.from(b.push));
    expect(a.calls.map((c) => Array.from(c))).toEqual(b.calls.map((c) => Array.from(c)));
  });
});
