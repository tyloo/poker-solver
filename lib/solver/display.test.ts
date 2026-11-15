import { describe, expect, it } from "vitest";
import { cardId } from "@/lib/poker/card";
import { actionColours, actionLabel, actionPhrase, actionShares, chanceLabel, formatChips, stepLabel } from "./display";
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

describe("actionLabel / actionPhrase", () => {
  it("names each action with its size: bets and all-ins by their street total, calls by what they add", () => {
    expect(actionLabel(act("check"), "en")).toBe("Check");
    expect(actionLabel(act("fold"), "en")).toBe("Fold");
    expect(actionLabel(act("call", 182, 182), "en")).toBe("Call 1.82bb");
    expect(actionLabel(act("bet", 182), "en")).toBe("Bet 1.82bb");
    expect(actionLabel(act("raise", 546, 364), "en")).toBe("Raise to 5.46bb");
    expect(actionLabel(act("allin", 3750), "en")).toBe("All-in 37.5bb");
    expect(actionPhrase("BB", act("check"), "en")).toBe("BB checks");
    expect(actionPhrase("BTN", act("bet", 182), "en")).toBe("BTN bets 1.82bb");
    expect(actionPhrase("BB", act("raise", 546, 364), "en")).toBe("BB raises to 5.46bb");
    expect(actionPhrase("BTN", act("call", 182), "en")).toBe("BTN calls 1.82bb");
    expect(actionPhrase("OOP", act("fold"), "en")).toBe("OOP folds");
    expect(actionPhrase("IP", act("allin", 3750), "en")).toBe("IP goes all-in 37.5bb");
  });

  it("speaks French", () => {
    expect(actionLabel(act("raise", 546, 364), "fr")).toBe("Relancer à 5,46bb");
    expect(actionPhrase("BB", act("check"), "fr")).toBe("BB checke");
    expect(actionPhrase("BTN", act("call", 182, 182), "fr")).toBe("BTN calle 1,82bb");
    expect(actionPhrase("IP", act("allin", 3750), "fr")).toBe("IP fait tapis à 37,5bb");
    expect(chanceLabel(cardId({ rank: "7", suit: "c" }), 3, "fr")).toBe("Turn 7c");
  });
});

describe("chanceLabel", () => {
  it("names the street and the card", () => {
    expect(chanceLabel(cardId({ rank: "7", suit: "c" }), 3, "en")).toBe("Turn 7c");
    expect(chanceLabel(cardId({ rank: "T", suit: "h" }), 4, "en")).toBe("River Th");
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

describe("stepLabel", () => {
  const board = ["Ks", "7d", "2h", "9c"].map((text) => cardId({ rank: text[0] as "K", suit: text[1] as "s" }));
  const players = ["BB", "BTN"] as const;

  it("names the step from a node: the action taken, or the card dealt", () => {
    const decision = { actions: [act("check"), act("bet", 182)], board, cards: [], kind: "action" as const, player: 1 as const };
    expect(stepLabel(decision, 1, players, "en")).toBe("BTN bets 1.82bb");
    const chance = { actions: [], board: board.slice(0, 3), cards: [board[3]], kind: "chance" as const, player: null };
    expect(stepLabel(chance, 0, players, "en")).toBe("Turn 9c");
  });

  it("returns null for an index the node does not have, e.g. a stale path", () => {
    const decision = { actions: [act("check")], board, cards: [], kind: "action" as const, player: 0 as const };
    expect(stepLabel(decision, 3, players, "en")).toBeNull();
    expect(stepLabel({ ...decision, actions: [], kind: "showdown" as const, player: null }, 0, players, "en")).toBeNull();
  });
});
