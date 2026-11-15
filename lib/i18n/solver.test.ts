import { describe, expect, it } from "vitest";
import { cardId } from "@/lib/poker/card";
import type { SolverAction } from "@/lib/solver/tree";
import { actionLabel, actionPhrase, chanceLabel, describeLine, setupProblemText, solverErrorText, stepLabel } from "./solver";

const act = (kind: SolverAction["kind"], to = 0, amount = to): SolverAction => ({ amount, kind, to });
const players = ["BB", "BTN"] as const;

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

describe("stepLabel", () => {
  const board = ["Ks", "7d", "2h", "9c"].map((text) => cardId({ rank: text[0] as "K", suit: text[1] as "s" }));

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

describe("describeLine", () => {
  it("names the line in plain words", () => {
    expect(describeLine({ caller: "BB", kind: "open", opener: "CO" }, 40, "en")).toBe("CO opens 2.5bb, BB calls, 40bb");
    expect(describeLine({ caller: "SB", kind: "open", opener: "BTN" }, 22.5, "en")).toBe("BTN opens 2bb, SB calls, 22.5bb");
    expect(describeLine({ kind: "limp" }, 30, "en")).toBe("SB limps, BB checks, 30bb");
    expect(describeLine({ caller: "BB", kind: "open", opener: "CO" }, 40, "fr")).toBe("CO ouvre à 2,5bb, BB calle, 40bb");
    expect(describeLine({ kind: "limp" }, 30, "fr")).toBe("SB limpe, BB checke, 30bb");
  });
});

describe("setupProblemText", () => {
  it("says what the Spot still needs, naming the player", () => {
    expect(setupProblemText({ code: "pick-board" }, players, "en")).toBe("Pick 3, 4 or 5 board cards.");
    expect(setupProblemText({ code: "set-amounts" }, players, "en")).toBe("Set the pot and the effective stack.");
    expect(setupProblemText({ code: "paint", player: 1 }, players, "en")).toBe("Paint a range for BTN.");
    expect(setupProblemText({ code: "range", error: { code: "invalid", entry: "AKx" }, player: 0 }, players, "en")).toBe('BB\'s range: Invalid entry "AKx"');
    expect(setupProblemText({ code: "line", error: "below-min" }, players, "en")).toBe("Below 15bb the Push/fold charts apply: pick a deeper stack.");
    expect(setupProblemText({ code: "spot", problem: { code: "empty-range", player: 0 } }, players, "en")).toBe("BB's range is empty on this board.");
    expect(setupProblemText({ code: "spot", problem: { code: "empty-range", player: 0 } }, players, "fr")).toBe("La range de BB est vide sur ce board.");
  });
});

describe("solverErrorText", () => {
  const over = { budgetBytes: 2 ** 20, code: "over-budget", memoryBytes: 5.5 * 2 ** 20 } as const;

  it("offers only what the setup can change: narrower ranges, fewer bet sizes, a later street", () => {
    expect(solverErrorText({ ...over, betSize: true, laterStreet: true }, players, "en")).toBe(
      "This spot needs about 6 MB, above the 1 MB budget. Narrow the ranges, drop a bet size or start from a later street.",
    );
    expect(solverErrorText({ ...over, betSize: false, laterStreet: true }, players, "en")).toMatch(/Narrow the ranges or start from a later street\.$/);
    expect(solverErrorText({ ...over, betSize: false, laterStreet: false }, players, "en")).toMatch(/Narrow the ranges\.$/);
    expect(solverErrorText({ ...over, betSize: true, laterStreet: true }, players, "fr")).toBe(
      "Ce spot demande environ 6\u00a0Mo, au-delà du budget de 1\u00a0Mo. Resserre les ranges, retire une taille de mise ou pars d’une street plus tardive.",
    );
  });

  it("translates the worker's errors", () => {
    expect(solverErrorText({ code: "no-solve" }, players, "fr")).toBe("Aucun calcul à reprendre.");
    expect(solverErrorText({ code: "solve-gone" }, players, "en")).toBe("That solve is no longer available.");
    expect(solverErrorText({ code: "spot", problem: { code: "pot" } }, players, "fr")).toBe("Le pot doit être positif.");
    expect(solverErrorText({ code: "blocked-ranges" }, players, "en")).toBe("The two ranges block each other completely on this board.");
    expect(solverErrorText({ code: "internal", message: "Unknown runout" }, players, "fr")).toBe("Erreur du Solveur\u00a0: Unknown runout");
  });
});
