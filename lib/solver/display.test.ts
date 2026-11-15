import { describe, expect, it } from "vitest";
import { actionColours, actionShares, formatChips } from "./display";
import type { NodeView, RangeView } from "./solver";
import type { SolverAction } from "./tree";

const act = (kind: SolverAction["kind"], to = 0, amount = to): SolverAction => ({ amount, kind, to });

describe("formatChips", () => {
  it("shows chips (1bb = 100) as bb with at most two decimals", () => {
    expect(formatChips(550, "en")).toBe("5.5bb");
    expect(formatChips(182, "en")).toBe("1.82bb");
    expect(formatChips(3750, "en")).toBe("37.5bb");
    expect(formatChips(100, "en")).toBe("1bb");
  });
});

describe("actionColours", () => {
  it("colours passive actions Call, all-in Push, fold Fold, and bets and raises in Raise shades, smallest lightest", () => {
    const colours = actionColours([act("check"), act("bet", 100), act("bet", 300), act("allin", 1000)]);
    expect(colours[0]).toBe("var(--color-call)");
    expect(colours[3]).toBe("var(--color-push)");
    expect(colours[2]).toBe("var(--color-raise)");
    expect(colours[1]).toMatch(/color-mix\(.*var\(--color-raise\)/);
    expect(actionColours([act("fold"), act("call", 100), act("raise", 300, 200)])).toEqual(["var(--color-fold)", "var(--color-call)", "var(--color-raise)"]);
  });
});

describe("actionShares", () => {
  it("weights each Combo's strategy by its reach", () => {
    const range = { reach: Float64Array.from([1, 0.5, 0]), strategy: Float64Array.from([1, 0, 0.3, 0, 1, 0.7]) } as unknown as RangeView;
    const view = { actions: [act("check"), act("bet", 100)], player: 0, ranges: [range, range] } as unknown as NodeView;
    const [check, bet] = actionShares(view);
    expect(check).toBeCloseTo(1 / 1.5);
    expect(bet).toBeCloseTo(0.5 / 1.5);
  });

  it("is empty away from decisions", () => {
    expect(actionShares({ actions: [], player: null } as unknown as NodeView)).toEqual([]);
  });
});
