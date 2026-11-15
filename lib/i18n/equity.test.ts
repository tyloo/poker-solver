import { describe, expect, it } from "vitest";
import { cardId, parseCards } from "@/lib/poker/card";
import { equityErrorText, equityMissingText } from "./equity";

const card = (text: string) => cardId((parseCards(text) ?? [])[0]);

describe("equityErrorText", () => {
  it("explains engine errors in English", () => {
    expect(equityErrorText({ code: "too-few" }, "en")).toBe("Add at least 2 players.");
    expect(equityErrorText({ code: "too-many", max: 8 }, "en")).toBe("At most 8 players.");
    expect(equityErrorText({ code: "needs-two", player: 0 }, "en")).toBe("Player 1 needs two cards.");
    expect(equityErrorText({ code: "board-size" }, "en")).toBe("The board has at most 5 cards.");
    expect(equityErrorText({ card: card("As"), code: "used-twice" }, "en")).toBe("A♠ is used twice.");
    expect(equityErrorText({ code: "range-empty", player: 1 }, "en")).toBe("Player 2's range is empty.");
    expect(equityErrorText({ code: "range-blocked", player: 1 }, "en")).toBe("Player 2's range has no hand left after the cards in use.");
    expect(equityErrorText({ code: "cannot-deal" }, "en")).toBe("These ranges cannot be dealt together: they need the same cards.");
    expect(equityErrorText({ code: "too-much-overlap" }, "en")).toBe("These ranges overlap too much to sample.");
  });

  it("explains engine errors in French", () => {
    expect(equityErrorText({ card: card("Ah"), code: "used-twice" }, "fr")).toBe("A♥ est utilisée deux fois.");
    expect(equityErrorText({ code: "needs-two", player: 2 }, "fr")).toBe("Le joueur 3 doit avoir deux cartes.");
  });
});

describe("equityMissingText", () => {
  it("says what the setup is missing", () => {
    expect(equityMissingText({ code: "pick-two", player: 0 }, "en")).toBe("Pick two cards for Player 1.");
    expect(equityMissingText({ code: "paint", player: 1 }, "en")).toBe("Paint a range for Player 2.");
    expect(equityMissingText({ code: "range", error: { code: "invalid", entry: "ZZ" }, player: 1 }, "en")).toBe('Player 2\'s range: Invalid entry "ZZ"');
    expect(equityMissingText({ code: "range", error: { code: "invalid", entry: "ZZ" }, player: 1 }, "fr")).toBe("Range du joueur 2\u00a0: Entrée invalide\u00a0: «\u00a0ZZ\u00a0»");
  });
});
