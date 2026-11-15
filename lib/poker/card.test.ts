import { describe, expect, it } from "vitest";
import { formatCards, parseCards } from "./card";

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
