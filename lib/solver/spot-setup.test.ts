import { describe, expect, it } from "vitest";
import { cardId, parseCards } from "@/lib/poker/card";
import { formatRange, parseRange } from "@/lib/poker/range";
import { lineSpot } from "./preflop-line";
import { betSizesFor, CHIPS_PER_BB, resolveSetup } from "./spot-setup";
import { DEFAULT_SETUP, type SpotSetup } from "./spot-url";

const cards = (text: string) => (parseCards(text) ?? []).map(cardId);
const setup = (fields: Partial<SpotSetup>): SpotSetup => ({ ...DEFAULT_SETUP, ...fields });
const range = (text: string) => {
  const parsed = parseRange(text);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.range;
};

describe("betSizesFor", () => {
  it("defaults to 33% and 75% on the turn and river, and one size (75%) on the flop", () => {
    expect(betSizesFor(null, 4)).toEqual([33, 75]);
    expect(betSizesFor(null, 5)).toEqual([33, 75]);
    expect(betSizesFor(null, 0)).toEqual([33, 75]);
    expect(betSizesFor(null, 3)).toEqual([75]);
  });

  it("keeps only the largest chosen size on the flop", () => {
    expect(betSizesFor([33, 50], 4)).toEqual([33, 50]);
    expect(betSizesFor([33, 50], 3)).toEqual([50]);
  });
});

describe("resolveSetup", () => {
  it("builds the default line's turn Spot in chips (1bb = 100), with the line's Ranges and Positions", () => {
    const board = cards("Ks7d2h9c");
    const resolved = resolveSetup(setup({ board }));
    const line = lineSpot({ caller: "BB", kind: "open", opener: "BTN" }, 40);
    if (!line.ok || !resolved.spot) throw new Error(resolved.reason ?? "no line");
    expect(resolved.players).toEqual(["BB", "BTN"]);
    expect(resolved.pot).toBe(5.5);
    expect(resolved.stack).toBe(37.5);
    expect(resolved.rangeTexts).toEqual([formatRange(line.ranges[0]), formatRange(line.ranges[1])]);
    expect(resolved.spot).toEqual({ betSizes: [0.33, 0.75], board, effectiveStack: 3750, pot: 550, raiseSizes: [3], ranges: line.ranges });
    expect(resolved.reason).toBeNull();
    expect(CHIPS_PER_BB).toBe(100);
  });

  it("uses the overrides for the pot, stack, Ranges and sizes", () => {
    const resolved = resolveSetup(setup({ bets: [50, 100], board: cards("Ks7d2h9c3s"), pot: 10, raise: 2.5, ranges: ["QQ+,AKs", "22+"], stack: 20.5 }));
    expect(resolved.spot).toEqual({
      betSizes: [0.5, 1],
      board: cards("Ks7d2h9c3s"),
      effectiveStack: 2050,
      pot: 1000,
      raiseSizes: [2.5],
      ranges: [range("QQ+, AKs"), range("22+")],
    });
    expect(resolved.rangeTexts).toEqual(["QQ+,AKs", "22+"]);
  });

  it("limits a flop Spot to one bet size and all-in raises", () => {
    const resolved = resolveSetup(setup({ bets: [33, 75], board: cards("Ks7d2h") }));
    expect(resolved.street).toBe("flop");
    expect(resolved.bets).toEqual([75]);
    expect(resolved.raises).toEqual([]);
    expect(resolved.spot?.betSizes).toEqual([0.75]);
    expect(resolved.spot?.raiseSizes).toEqual([]);
  });

  it("asks for the board first", () => {
    const resolved = resolveSetup(setup({ board: cards("Ks7d") }));
    expect(resolved.spot).toBeNull();
    expect(resolved.reason).toBe("Pick 3, 4 or 5 board cards.");
    expect(resolved.street).toBeNull();
  });

  it("names the player whose Range is invalid or empty", () => {
    expect(resolveSetup(setup({ board: cards("Ks7d2h9c"), ranges: ["AKx", null] })).reason).toMatch(/^BB's range: /);
    expect(resolveSetup(setup({ board: cards("Ks7d2h9c"), ranges: [null, ""] })).reason).toBe("Paint a range for BTN.");
  });

  it("reports a line that cannot produce a Spot, unless the overrides replace it", () => {
    expect(resolveSetup(setup({ board: cards("Ks7d2h9c"), depth: 10 })).reason).toMatch(/15bb/);
    const custom = resolveSetup(setup({ board: cards("Ks7d2h9c"), depth: 10, pot: 3, ranges: ["QQ+", "22+"], stack: 8 }));
    expect(custom.reason).toBeNull();
    expect(custom.spot?.pot).toBe(300);
  });

  it("without a Preflop line, calls the players OOP and IP and needs every amount and Range", () => {
    const missing = resolveSetup(setup({ board: cards("Ks7d2h9c"), line: null }));
    expect(missing.players).toEqual(["OOP", "IP"]);
    expect(missing.reason).toBe("Set the pot and the effective stack.");
    expect(resolveSetup(setup({ board: cards("Ks7d2h9c"), line: null, pot: 5, stack: 20 })).reason).toBe("Paint a range for OOP.");
  });

  it("passes the engine's own checks through, e.g. a Range blocked by the board", () => {
    expect(resolveSetup(setup({ board: cards("AsAhAd"), ranges: ["AA", "22+"] })).reason).toMatch(/empty on this board/);
  });

  it("gives equal setups the same key and different Spots different keys", () => {
    const a = resolveSetup(setup({ board: cards("Ks7d2h9c") }));
    const b = resolveSetup(setup({ board: cards("Ks7d2h9c"), hand: cards("AsKd") }));
    const c = resolveSetup(setup({ bets: [50], board: cards("Ks7d2h9c") }));
    expect(a.key).toBe(b.key);
    expect(a.key).not.toBe(c.key);
  });
});
