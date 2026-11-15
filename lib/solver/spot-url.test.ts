import { describe, expect, it } from "vitest";
import { cardId, parseCards } from "@/lib/poker/card";
import { parseRange } from "@/lib/poker/range";
import { DEFAULT_DEPTH, DEFAULT_LINE } from "./preflop-line";
import { DEFAULT_LEVEL, DEFAULT_RAISE, DEFAULT_SETUP, parseSpotParams, type SpotSetup, solverHref, spotParams, treePathCodec } from "./spot-url";

const cards = (text: string) => (parseCards(text) ?? []).map(cardId);
const params = (query: string) => new URLSearchParams(query);
const roundTrip = (setup: Partial<SpotSetup>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(spotParams(setup))) if (value !== null) search.set(key, value);
  return parseSpotParams(search);
};

describe("parseSpotParams", () => {
  it("defaults to BTN opens, BB calls at 40bb, no board, Ranges and amounts from the line", () => {
    expect(parseSpotParams(params(""))).toEqual(DEFAULT_SETUP);
    expect(DEFAULT_SETUP).toEqual({
      bets: null,
      board: [],
      depth: DEFAULT_DEPTH,
      hand: [],
      level: DEFAULT_LEVEL,
      line: DEFAULT_LINE,
      pot: null,
      raise: DEFAULT_RAISE,
      ranges: [null, null],
      stack: null,
    });
  });

  it("defaults to the first Blind level where the SB is half the BB (level 2, 50/100)", () => {
    expect(DEFAULT_LEVEL).toBe(2);
  });

  it("reads every param", () => {
    const setup = parseSpotParams(params("line=CO_BB&depth=25&level=1&board=Ks7d2h9c&pot=5.5&stack=22.5&oop=22%2B,A2s%2B&ip=QQ%2B&bets=50_33&raise=2.5&hand=AsKd"));
    expect(setup).toEqual({
      bets: [33, 50],
      board: cards("Ks7d2h9c"),
      depth: 25,
      hand: cards("AsKd"),
      level: 1,
      line: { caller: "BB", kind: "open", opener: "CO" },
      pot: 5.5,
      raise: 2.5,
      ranges: ["22+,A2s+", "QQ+"],
      stack: 22.5,
    });
    expect(parseSpotParams(params("line=limp")).line).toEqual({ kind: "limp" });
    expect(parseSpotParams(params("line=UTG%2B1_BB")).line).toEqual({ caller: "BB", kind: "open", opener: "UTG+1" });
  });

  it("repairs malformed values instead of failing", () => {
    const setup = parseSpotParams(params("line=BB_CO&depth=abc&level=0&board=AsAs&pot=-1&stack=x&bets=0_abc&raise=1&hand=As"));
    expect(setup).toEqual(DEFAULT_SETUP);
    expect(parseSpotParams(params("line=CO_HJ")).line).toEqual(DEFAULT_LINE);
    expect(parseSpotParams(params("level=1.5")).level).toBe(DEFAULT_LEVEL);
    expect(parseSpotParams(params("board=AsKdQhJcTs9s")).board).toEqual(cards("AsKdQhJcTs"));
  });

  it("keeps an emptied Range as an empty string, so it is not replaced by the line's Range", () => {
    expect(parseSpotParams(params("oop=")).ranges).toEqual(["", null]);
  });
});

describe("spotParams", () => {
  it("writes only the given keys, with defaults as null so they leave the URL", () => {
    expect(spotParams({ board: [], line: DEFAULT_LINE, pot: null })).toEqual({ board: null, line: null, pot: null });
    expect(spotParams({ bets: [75, 33], depth: 30, raise: 3, ranges: ["QQ+, AKs", null] })).toEqual({ bets: "33_75", depth: "30", ip: null, oop: "QQ+,AKs", raise: null });
    expect(spotParams({ level: DEFAULT_LEVEL })).toEqual({ level: null });
    expect(spotParams({ level: 1 })).toEqual({ level: "1" });
  });

  it("round-trips a full setup", () => {
    const setup: SpotSetup = {
      bets: [33, 75, 150],
      board: cards("Ks7d2h"),
      depth: 22.5,
      hand: cards("QhQd"),
      level: 7,
      line: { caller: "SB", kind: "open", opener: "UTG+1" },
      pot: 6.25,
      raise: 4,
      ranges: ["TT+,AQs+,AKo", "22+,ATo:0.5"],
      stack: 20.25,
    };
    expect(roundTrip(setup)).toEqual(setup);
    expect(roundTrip({ line: { kind: "limp" } }).line).toEqual({ kind: "limp" });
    expect(roundTrip({ line: null }).line).toBeNull();
  });
});

describe("solverHref", () => {
  it("links to the default Spot without params", () => {
    expect(solverHref({})).toBe("/solver");
  });

  it("carries a Spot from the Advisor: line, board, amounts in bb, Ranges, sizes and the hero's hand", () => {
    const oop = parseRange("QQ+, AKs");
    if (!oop.ok) throw new Error(oop.error);
    const href = solverHref({
      betSizes: [0.33, 0.75],
      board: cards("Ks7d2h9c"),
      depth: 30,
      hand: cards("AsKd"),
      level: 1,
      line: { caller: "BB", kind: "open", opener: "CO" },
      pot: 4.5,
      ranges: [oop.range, "22+, ATo:0.5"],
      stack: 28,
    });
    expect(href).toBe("/solver?line=CO_BB&depth=30&level=1&board=Ks7d2h9c&pot=4.5&stack=28&oop=QQ%2B%2CAKs&ip=22%2B%2CATo%3A0.5&bets=33_75&hand=AsKd");
    const setup = parseSpotParams(new URL(href, "https://example.com").searchParams);
    expect(setup.ranges).toEqual(["QQ+,AKs", "22+,ATo:0.5"]);
    expect(setup.bets).toEqual([33, 75]);
    expect(setup.pot).toBe(4.5);
    expect(setup.level).toBe(1);
  });

  it("marks a Spot with Ranges but no Preflop line as line=none, so the players are just OOP and IP", () => {
    const href = solverHref({ board: cards("Ks7d2h"), pot: 10, ranges: ["QQ+", "22+"], stack: 40 });
    expect(href).toBe("/solver?line=none&board=Ks7d2h&pot=10&stack=40&oop=QQ%2B&ip=22%2B");
    expect(parseSpotParams(new URL(href, "https://example.com").searchParams).line).toBeNull();
  });

  it("rounds amounts to 0.01bb", () => {
    expect(solverHref({ pot: 5.123456, stack: 1 / 3 })).toBe("/solver?pot=5.12&stack=0.33");
  });
});

describe("treePathCodec", () => {
  it("writes the path through the tree as dot-separated indexes, and the root as no param", () => {
    expect(treePathCodec.serialize([0, 2, 17])).toBe("0.2.17");
    expect(treePathCodec.serialize([])).toBeNull();
    expect(treePathCodec.parse("0.2.17")).toEqual([0, 2, 17]);
    expect(treePathCodec.parse(null)).toEqual([]);
  });

  it("falls back to the root on a malformed path", () => {
    for (const raw of ["", "a", "0..1", "1.-2", "1.5x", "0.1.2.", "1.2.5e1"]) expect(treePathCodec.parse(raw), raw).toEqual([]);
  });
});
