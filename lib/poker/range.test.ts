import { describe, expect, it } from "vitest";
import { COMBO_COUNT, HAND_CLASS_COUNT, HAND_CLASS_NAMES, handClassCombos, parseCombo, parseHandClass } from "./combo";
import { createRange, formatRange, handClassWeights, parseRange, type Range, type RangeProblem, rangeCombos, rangeShare, setHandClassWeight } from "./range";

function parsed(text: string): Range {
  const result = parseRange(text);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.range;
}

function errorOf(text: string): RangeProblem {
  const result = parseRange(text);
  if (result.ok) throw new Error(`expected "${text}" to be rejected`);
  return result.error;
}

/** Hand class names with weight > 0, in grid order, with ":w" when not 1. */
function classesOf(range: Range): string[] {
  const weights = handClassWeights(range);
  return HAND_CLASS_NAMES.flatMap((name, cls) => (weights[cls] === 0 ? [] : [weights[cls] === 1 ? name : `${name}:${weights[cls]}`]));
}

const comboCount = (range: Range) => range.reduce((sum, weight) => sum + weight, 0);

describe("parseRange", () => {
  it("reads an empty string as an empty range", () => {
    expect(comboCount(parsed(""))).toBe(0);
    expect(comboCount(parsed("  "))).toBe(0);
  });

  it("reads single Hand classes", () => {
    expect(classesOf(parsed("AKo"))).toEqual(["AKo"]);
    expect(classesOf(parsed("AKs"))).toEqual(["AKs"]);
    expect(classesOf(parsed("QQ"))).toEqual(["QQ"]);
    expect(classesOf(parsed("AK"))).toEqual(["AKs", "AKo"]);
    expect(comboCount(parsed("AKo"))).toBe(12);
    expect(comboCount(parsed("AK"))).toBe(16);
  });

  it("reads pair ranges", () => {
    expect(comboCount(parsed("22+"))).toBe(78);
    expect(classesOf(parsed("QQ+"))).toEqual(["AA", "KK", "QQ"]);
    expect(classesOf(parsed("TT-88"))).toEqual(["TT", "99", "88"]);
    expect(classesOf(parsed("88-TT"))).toEqual(["TT", "99", "88"]);
    expect(classesOf(parsed("AA+"))).toEqual(["AA"]);
  });

  it("reads kicker ranges", () => {
    expect(classesOf(parsed("A2s+"))).toEqual(["AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s"]);
    expect(classesOf(parsed("KTs-K8s"))).toEqual(["KTs", "K9s", "K8s"]);
    expect(classesOf(parsed("K8s-KTs"))).toEqual(["KTs", "K9s", "K8s"]);
    expect(classesOf(parsed("AJo+"))).toEqual(["AKo", "AQo", "AJo"]);
    expect(classesOf(parsed("QT+"))).toEqual(["QJs", "QTs", "QJo", "QTo"]);
    expect(classesOf(parsed("J8-J7"))).toEqual(["J8s", "J7s", "J8o", "J7o"]);
    expect(classesOf(parsed("AKs+"))).toEqual(["AKs"]);
  });

  it("reads specific Combos", () => {
    const range = parsed("AsKd");
    expect(comboCount(range)).toBe(1);
    expect(range[parseCombo("AsKd") ?? -1]).toBe(1);
    expect(classesOf(parsed("AsKs, AhKh, AdKd, AcKc"))).toEqual(["AKs"]);
  });

  it("reads frequency suffixes", () => {
    expect(classesOf(parsed("ATo:0.5, KQo:.25, 22+:1"))).toEqual(expect.arrayContaining(["ATo:0.5", "KQo:0.25", "AA", "22"]));
    expect(parsed("AsKd:0.7")[parseCombo("AsKd") ?? -1]).toBe(0.7);
  });

  it("is lenient about spacing, case, rank order and stray commas", () => {
    expect(classesOf(parsed(" kqs ,  ako:0.5,"))).toEqual(["AKo:0.5", "KQs"]);
    expect(classesOf(parsed("KAs"))).toEqual(["AKs"]);
    expect(classesOf(parsed("2As+"))).toEqual(classesOf(parsed("A2s+")));
  });

  it("rejects malformed entries with a code and the entry", () => {
    expect(errorOf("AKx")).toEqual({ code: "invalid", entry: "AKx" });
    expect(errorOf("A")).toEqual({ code: "invalid", entry: "A" });
    expect(errorOf("AKs, 1x")).toEqual({ code: "invalid", entry: "1x" });
    expect(errorOf("AAs")).toEqual({ code: "suited-pair", entry: "AAs" });
    expect(errorOf("AsAs")).toEqual({ code: "repeated-card", entry: "AsAs" });
    for (const text of ["AKs:1.5", "AKs:0", "AKs:abc", "AKs:"]) expect(errorOf(text)).toEqual({ code: "frequency", entry: text });
  });

  it("rejects spans whose ends do not match", () => {
    expect(errorOf("KTs-Q8s")).toEqual({ code: "first-rank", entry: "KTs-Q8s" });
    expect(errorOf("KTs-K8o")).toEqual({ code: "suffix", entry: "KTs-K8o" });
    expect(errorOf("QQ-AKs")).toEqual({ code: "pair-ends", entry: "QQ-AKs" });
  });

  it("rejects overlapping entries, naming the first overlap", () => {
    expect(errorOf("AKs, AQs+")).toEqual({ code: "overlap", entry: "AQs+", name: "AKs" });
    expect(errorOf("AsKs, AKs")).toEqual({ code: "overlap", entry: "AKs", name: "AsKs" });
    expect(errorOf("22+, 55:0.5")).toEqual({ code: "overlap", entry: "55:0.5", name: "55" });
    expect(errorOf("AK, AKo")).toEqual({ code: "overlap", entry: "AKo", name: "AKo" });
  });
});

describe("formatRange", () => {
  const canonical = (text: string) => formatRange(parsed(text));

  it("compresses into the shortest notation, keeping suited and offsuit apart", () => {
    expect(canonical("")).toBe("");
    expect(canonical("AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22")).toBe("22+");
    expect(canonical("AA, KK")).toBe("KK+");
    expect(canonical("AA")).toBe("AA");
    expect(canonical("KK, QQ")).toBe("KK-QQ");
    expect(canonical("99")).toBe("99");
    expect(canonical("AKs, AQs, AJs, ATs")).toBe("ATs+");
    expect(canonical("AKs")).toBe("AKs");
    expect(canonical("KTs, K9s, K8s")).toBe("KTs-K8s");
    expect(canonical("A5s, A4s, A3s, A2s")).toBe("A5s-A2s");
    expect(canonical("AKs, AKo")).toBe("AKs, AKo");
    expect(canonical("AK")).toBe("AKs, AKo");
    expect(canonical("AsKs, AhKh, AdKd, AcKc")).toBe("AKs");
    expect(canonical("QJs, QTs, QJo, QTo")).toBe("QTs+, QTo+");
    expect(canonical("QT+")).toBe("QTs+, QTo+");
    expect(canonical("AsKd")).toBe("AsKd");
  });

  it("keeps the spec example as written", () => {
    expect(canonical("22+, A2s+, KTs+, AJo+, KQo, ATo:0.5")).toBe("22+, A2s+, KTs+, AJo+, KQo, ATo:0.5");
  });

  it("orders full weights first, then lower frequencies, then specific Combos", () => {
    expect(canonical("ATo:0.5, AsKd:0.5, 77:0.25, KQs, TT+")).toBe("TT+, KQs, ATo:0.5, AsKd:0.5, 77:0.25");
  });

  it("splits a Hand class with mixed Combo weights into Combos", () => {
    expect(canonical("AsKs:0.5, AhKh, AdKd, AcKc")).toBe("AhKh, AdKd, AcKc, AsKs:0.5");
  });

  const samples = [
    "22+, A2s+, KTs+, AJo+, KQo, ATo:0.5",
    "77+, A9s+, KTs+, QTs+, JTs, AJo+, KQo",
    "TT-88:0.5, A5s-A2s:0.7, AsKd, KhQh:0.3, 65s:0.25",
    "AA, 72o, T9s:0.333",
    "QQ+, AKs, AKo, A8s-A6s, K2s+:0.5, 22-55:0.2",
    "AsAh, AdAc:0.5, KsKh:0.1, 32o",
  ];

  it.each(samples)("round-trips %s", (text) => {
    const first = parsed(text);
    const formatted = formatRange(first);
    expect(parsed(formatted)).toEqual(first);
    expect(formatRange(parsed(formatted))).toBe(formatted);
    expect(formatted.length).toBeLessThanOrEqual(text.length);
  });

  it("round-trips random ranges of Hand classes and Combos", () => {
    let seed = 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const weights = [0, 0, 0, 1, 1, 0.5, 0.25, 0.7];
    for (let sample = 0; sample < 200; sample++) {
      const range = createRange();
      for (let cls = 0; cls < HAND_CLASS_COUNT; cls++) setHandClassWeight(range, cls, weights[Math.floor(random() * weights.length)]);
      for (let i = 0; i < 5; i++) range[Math.floor(random() * COMBO_COUNT)] = weights[Math.floor(random() * weights.length)];
      expect(parsed(formatRange(range))).toEqual(range);
    }
  });
});

describe("Hand class weights", () => {
  it("average Combo weights per Hand class", () => {
    const weights = handClassWeights(parsed("AsKs, AhKh, QQ:0.5"));
    expect(weights[parseHandClass("AKs") ?? -1]).toBe(0.5);
    expect(weights[parseHandClass("QQ") ?? -1]).toBe(0.5);
    expect(weights[parseHandClass("AKo") ?? -1]).toBe(0);
  });

  it("keep a shared weight exact", () => {
    expect(handClassWeights(parsed("ATo:0.7"))[parseHandClass("ATo") ?? -1]).toBe(0.7);
  });

  it("set every Combo of a Hand class", () => {
    const range = createRange();
    const cls = parseHandClass("T9o") ?? -1;
    setHandClassWeight(range, cls, 0.4);
    for (const combo of handClassCombos(cls)) expect(range[combo]).toBe(0.4);
    expect(comboCount(range)).toBeCloseTo(12 * 0.4);
  });
});

describe("rangeCombos and rangeShare", () => {
  it("count weighted Combos and their share of all 1326", () => {
    expect(rangeCombos(parsed("AA, AKs:0.5"))).toBe(8);
    expect(
      rangeShare(parsed("22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q2o+, J2o+, T2o+, 92o+, 82o+, 72o+, 62o+, 52o+, 42o+, 32o")),
    ).toBe(1);
    expect(rangeShare(createRange())).toBe(0);
  });
});
