import { describe, expect, it } from "vitest";
import { type CardId, cardId, parseCards } from "@/lib/poker/card";
import { withParams } from "@/lib/url-state";
import { type AdvisorSetup, advisorParams, bigBlindChips, DEFAULT_SETUP, parseAdvisorParams, parseAmount, preflopQuestion, stackDepthOf, toUnit } from "./setup";

const cards = (text: string): CardId[] => (parseCards(text) ?? []).map(cardId);
const parse = (query: string) => parseAdvisorParams(new URLSearchParams(query));
const roundTrip = (setup: AdvisorSetup) => parse(withParams("", advisorParams(setup)));

describe("parseAdvisorParams", () => {
  it("starts empty at a full table with the starting stack at level 1", () => {
    expect(parse("")).toEqual(DEFAULT_SETUP);
    expect(DEFAULT_SETUP).toMatchObject({ hand: [], players: 8, position: null, situation: "folded", stack: { chips: 10_000, level: 1, unit: "chips" } });
  });

  it("reads every field", () => {
    const setup = parse("hand=AsKd&players=6&pos=CO&sit=open&opener=HJ&chips=12500&level=4&board=Ks7d2h&pot=1200&bet=600&opp=HJ.l_BB.t");
    expect(setup).toMatchObject({
      bet: 600,
      board: cards("Ks7d2h"),
      hand: cards("AsKd"),
      opener: "HJ",
      opponents: [
        { position: "HJ", type: "loose" },
        { position: "BB", type: "tight" },
      ],
      players: 6,
      position: "CO",
      pot: 1200,
      situation: "open",
      stack: { chips: 12_500, level: 4, unit: "chips" },
    });
  });

  it("switches to direct bb entry when `bb` is present", () => {
    expect(parse("bb=12.5").stack).toEqual({ bb: 12.5, unit: "bb" });
    expect(parse("bb=").stack).toEqual({ bb: null, unit: "bb" });
  });

  it("drops malformed values", () => {
    const setup = parse("hand=AsAs&players=12&pos=XX&sit=raise&chips=-5&level=0&pot=abc&opp=ZZ.l_CO.q_BTN.s");
    expect(setup).toMatchObject({ hand: [], players: 8, pot: null, position: null, situation: "folded", stack: { chips: null, level: 1, unit: "chips" } });
    expect(setup.opponents).toEqual([{ position: "BTN", type: "standard" }]);
  });

  it("keeps a one-card hand out", () => {
    expect(parse("hand=As").hand).toEqual([]);
  });

  it("tells default opponents (absent) from none", () => {
    expect(parse("").opponents).toBeNull();
    expect(parse("opp=none").opponents).toEqual([]);
  });
});

describe("advisorParams", () => {
  it("leaves defaults out of the URL", () => {
    expect(withParams("", advisorParams(DEFAULT_SETUP))).toBe("");
  });

  it("round-trips a full setup", () => {
    const setup: AdvisorSetup = {
      ...DEFAULT_SETUP,
      bet: 200,
      board: cards("Ks7d2h9c"),
      hand: cards("QhJh"),
      limpers: "2+",
      opponents: [{ position: "UTG+1", type: "loose" }],
      players: 7,
      position: "BTN",
      pot: 900,
      situation: "limps",
      stack: { bb: 18.5, unit: "bb" },
    };
    expect(roundTrip(setup)).toEqual(setup);
    expect(roundTrip({ ...setup, opponents: [] }).opponents).toEqual([]);
    expect(roundTrip({ ...setup, stack: { chips: null, level: 3, unit: "chips" } }).stack).toEqual({ chips: null, level: 3, unit: "chips" });
  });

  it("writes only the fields given", () => {
    expect(advisorParams({ position: "CO" })).toEqual({ pos: "CO" });
    expect(advisorParams({ stack: { chips: 8000, level: 2, unit: "chips" } })).toEqual({ bb: null, chips: "8000", level: "2" });
  });
});

describe("stack", () => {
  it("turns chips at a Blind level into a Stack depth", () => {
    expect(stackDepthOf({ chips: 10_000, level: 1, unit: "chips" })).toBe(200);
    expect(stackDepthOf({ chips: 10_000, level: 5, unit: "chips" })).toBe(25);
    expect(stackDepthOf({ chips: 10_000, level: 11, unit: "chips" })).toBe(10_000 / 16_000);
    expect(stackDepthOf({ bb: 12.5, unit: "bb" })).toBe(12.5);
    expect(stackDepthOf({ chips: null, level: 1, unit: "chips" })).toBeNaN();
  });

  it("knows the big blind in chips only in chips mode", () => {
    expect(bigBlindChips({ chips: 5000, level: 4, unit: "chips" })).toBe(300);
    expect(bigBlindChips({ bb: 20, unit: "bb" })).toBeUndefined();
  });

  it("converts pot and bet amounts to bb", () => {
    expect(toUnit(600, { chips: 5000, level: 4, unit: "chips" })).toBe(2);
    expect(toUnit(7.5, { bb: 20, unit: "bb" })).toBe(7.5);
  });
});

describe("preflopQuestion", () => {
  it("needs two cards and a Position", () => {
    expect(preflopQuestion(DEFAULT_SETUP)).toEqual({ missing: "hand" });
    expect(preflopQuestion({ ...DEFAULT_SETUP, hand: cards("AsKd") })).toEqual({ missing: "position" });
  });

  it("builds the Situation from its picker", () => {
    const base = { ...DEFAULT_SETUP, hand: cards("AsKd"), position: "CO" as const };
    expect(preflopQuestion(base)).toEqual({ question: { depth: 200, hand: cards("AsKd"), players: 8, position: "CO", situation: { kind: "folded" } } });
    expect(preflopQuestion({ ...base, limpers: "2+", situation: "limps" })).toMatchObject({ question: { situation: { kind: "limps", limpers: "2+" } } });
    expect(preflopQuestion({ ...base, opener: "HJ", situation: "open" })).toMatchObject({ question: { situation: { kind: "open", opener: "HJ" } } });
    expect(preflopQuestion({ ...base, situation: "open" })).toEqual({ missing: "opener" });
    expect(preflopQuestion({ ...base, situation: "push" })).toEqual({ missing: "pusher" });
  });

  it("ignores a Position the table does not have", () => {
    expect(preflopQuestion({ ...DEFAULT_SETUP, hand: cards("AsKd"), players: 6, position: "UTG" })).toEqual({ missing: "position" });
  });
});

describe("parseAmount", () => {
  it("reads chips with thousands separators", () => {
    expect(parseAmount("12500")).toBe(12_500);
    expect(parseAmount("12 500")).toBe(12_500);
    expect(parseAmount("12,500")).toBe(12_500);
    expect(parseAmount("12.500")).toBe(12_500);
  });

  it("reads bb with a decimal point or comma", () => {
    expect(parseAmount("12.5", { decimal: true })).toBe(12.5);
    expect(parseAmount("12,5", { decimal: true })).toBe(12.5);
    expect(parseAmount(".5", { decimal: true })).toBe(0.5);
  });

  it("rejects empty, negative, zero and junk input", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("0", { allowZero: true })).toBe(0);
    expect(parseAmount("12k")).toBeNull();
    expect(parseAmount("1.2.3", { decimal: true })).toBeNull();
  });
});
