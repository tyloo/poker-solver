import { describe, expect, it } from "vitest";
import { CARD_COUNT, cardFromId, cardId, cardRank, cardSuit, formatCards, parseCards } from "./card";

describe("parseCards", () => {
  it("reads rank-suit pairs", () => {
    expect(parseCards("AsKd")).toEqual([
      { rank: "A", suit: "s" },
      { rank: "K", suit: "d" },
    ]);
  });

  it("accepts lowercase ranks", () => {
    expect(parseCards("tc")).toEqual([{ rank: "T", suit: "c" }]);
  });

  it("returns null for invalid or duplicate cards", () => {
    expect(parseCards("AsK")).toBeNull();
    expect(parseCards("Ax")).toBeNull();
    expect(parseCards("AsAs")).toBeNull();
  });

  it("reads an empty string as no cards", () => {
    expect(parseCards("")).toEqual([]);
  });
});

describe("formatCards", () => {
  it("round-trips", () => {
    expect(formatCards(parseCards("Th9h2c") ?? [])).toBe("Th9h2c");
  });
});

describe("card ids", () => {
  it("number the deck 0..51 with deuces lowest and aces highest", () => {
    expect(CARD_COUNT).toBe(52);
    expect(cardId({ rank: "2", suit: "s" })).toBe(0);
    expect(cardId({ rank: "A", suit: "c" })).toBe(51);
    expect(cardRank(cardId({ rank: "A", suit: "h" }))).toBe(12);
    expect(cardRank(cardId({ rank: "T", suit: "d" }))).toBe(8);
    expect(cardSuit(cardId({ rank: "7", suit: "d" }))).toBe(2);
  });

  it("round-trip every card", () => {
    const ids = new Set<number>();
    for (let id = 0; id < CARD_COUNT; id++) {
      const card = cardFromId(id);
      expect(cardId(card)).toBe(id);
      ids.add(cardId(card));
    }
    expect(ids.size).toBe(52);
  });
});
