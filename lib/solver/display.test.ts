import { describe, expect, it } from "vitest";
import { cardId } from "@/lib/poker/card";
import { actionColours, actionLabel, actionPhrase, actionShares, chanceLabel, formatBb } from "./display";
import type { NodeView, RangeView } from "./solver";
import type { SolverAction } from "./tree";

const act = (kind: SolverAction["kind"], to = 0, amount = to): SolverAction => ({ amount, kind, to });

describe("formatBb", () => {
  it("shows chips (1bb = 100) as bb with at most two decimals", () => {
    expect(formatBb(550)).toBe("5.5bb");
    expect(formatBb(182)).toBe("1.82bb");
    expect(formatBb(3750)).toBe("37.5bb");
    expect(formatBb(100)).toBe("1bb");
  });
});

describe("actionLabel / actionPhrase", () => {
  it("names each action with its size: bets and all-ins by their street total, calls by what they add", () => {
    expect(actionLabel(act("check"))).toBe("Check");
    expect(actionLabel(act("fold"))).toBe("Fold");
    expect(actionLabel(act("call", 182, 182))).toBe("Call 1.82bb");
    expect(actionLabel(act("bet", 182))).toBe("Bet 1.82bb");
    expect(actionLabel(act("raise", 546, 364))).toBe("Raise to 5.46bb");
    expect(actionLabel(act("allin", 3750))).toBe("All-in 37.5bb");
    expect(actionPhrase("BB", act("check"))).toBe("BB checks");
    expect(actionPhrase("BTN", act("bet", 182))).toBe("BTN bets 1.82bb");
    expect(actionPhrase("BB", act("raise", 546, 364))).toBe("BB raises to 5.46bb");
    expect(actionPhrase("BTN", act("call", 182))).toBe("BTN calls 1.82bb");
    expect(actionPhrase("OOP", act("fold"))).toBe("OOP folds");
    expect(actionPhrase("IP", act("allin", 3750))).toBe("IP goes all-in 37.5bb");
  });
});

describe("chanceLabel", () => {
  it("names the street and the card", () => {
    expect(chanceLabel(cardId({ rank: "7", suit: "c" }), 3)).toBe("Turn 7c");
    expect(chanceLabel(cardId({ rank: "T", suit: "h" }), 4)).toBe("River Th");
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
