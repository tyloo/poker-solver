import { describe, expect, it } from "vitest";
import { STACK_TIERS } from "@/lib/poker/table";
import {
  type ChartSelection,
  chartActions,
  chartHref,
  chartKeyFor,
  chartKeys,
  describeChart,
  groupAvailable,
  heroPositions,
  openerGroupOf,
  parseChartParams,
  selectionParams,
} from "./model";

const selection = (overrides: Partial<ChartSelection>): ChartSelection => ({ limpers: "1", opener: "early", position: "CO", situation: "open", tier: "40bb+", ...overrides });

describe("openerGroupOf", () => {
  it("groups openers as early, middle or late", () => {
    expect(["UTG", "UTG+1", "LJ", "HJ", "CO", "BTN", "SB"].map((position) => openerGroupOf(position as never))).toEqual([
      "early",
      "early",
      "middle",
      "middle",
      "late",
      "late",
      "late",
    ]);
    expect(openerGroupOf("BB")).toBeNull();
  });
});

describe("heroPositions", () => {
  it("lets every Position but the BB open", () => {
    expect(heroPositions("open")).toEqual(["UTG", "UTG+1", "LJ", "HJ", "CO", "BTN", "SB"]);
  });

  it("only puts the hero after an opener of the group", () => {
    expect(heroPositions("vs-open", "early")).toEqual(["UTG+1", "LJ", "HJ", "CO", "BTN", "SB", "BB"]);
    expect(heroPositions("vs-open", "middle")).toEqual(["HJ", "CO", "BTN", "SB", "BB"]);
    expect(heroPositions("vs-open", "late")).toEqual(["BTN", "SB", "BB"]);
  });

  it("needs room for the limpers before the hero", () => {
    expect(heroPositions("vs-limpers", "1")).toEqual(["UTG+1", "LJ", "HJ", "CO", "BTN", "SB", "BB"]);
    expect(heroPositions("vs-limpers", "2+")).toEqual(["LJ", "HJ", "CO", "BTN", "SB", "BB"]);
  });
});

describe("chartKeys", () => {
  it("lists every Situation, Position and Stack tier combination once", () => {
    const keys = chartKeys();
    const count = (situation: string) => keys.filter((key) => key.situation === situation).length;
    expect(count("open")).toBe(7 * 3);
    expect(count("vs-open")).toBe((7 + 5 + 3) * 3);
    expect(count("vs-limpers")).toBe((7 + 6) * 3);
    expect(new Set(keys.map((key) => chartHref(key))).size).toBe(keys.length);
    for (const tier of STACK_TIERS) expect(keys.some((key) => key.tier === tier)).toBe(true);
  });
});

describe("chartKeyFor", () => {
  it("keeps a valid selection", () => {
    expect(chartKeyFor(selection({ opener: "late", position: "BB", situation: "vs-open", tier: "25bb" }))).toEqual({
      opener: "late",
      position: "BB",
      situation: "vs-open",
      tier: "25bb",
    });
    expect(chartKeyFor(selection({ limpers: "2+", position: "SB", situation: "vs-limpers" }))).toEqual({ limpers: "2+", position: "SB", situation: "vs-limpers", tier: "40bb+" });
    expect(chartKeyFor(selection({ position: "UTG" }))).toEqual({ position: "UTG", situation: "open", tier: "40bb+" });
  });

  it("moves an impossible Position to the nearest valid one", () => {
    expect(chartKeyFor(selection({ position: "BB", situation: "open" })).position).toBe("SB");
    expect(chartKeyFor(selection({ position: "UTG", situation: "vs-open" })).position).toBe("UTG+1");
  });

  it("moves an impossible opener or limper group to the nearest valid one", () => {
    expect(chartKeyFor(selection({ opener: "late", position: "HJ", situation: "vs-open" }))).toMatchObject({ opener: "middle", position: "HJ" });
    expect(chartKeyFor(selection({ opener: "late", position: "UTG+1", situation: "vs-open" }))).toMatchObject({ opener: "early", position: "UTG+1" });
    expect(chartKeyFor(selection({ limpers: "2+", position: "UTG+1", situation: "vs-limpers" }))).toMatchObject({ limpers: "1", position: "UTG+1" });
  });

  it("always yields one of the listed keys", () => {
    const hrefs = new Set(chartKeys().map(chartHref));
    for (const situation of ["open", "vs-open", "vs-limpers"] as const) {
      for (const position of ["UTG", "UTG+1", "LJ", "HJ", "CO", "BTN", "SB", "BB"] as const) {
        for (const opener of ["early", "middle", "late"] as const) {
          for (const limpers of ["1", "2+"] as const) expect(hrefs.has(chartHref(chartKeyFor({ limpers, opener, position, situation, tier: "25bb" })))).toBe(true);
        }
      }
    }
  });
});

describe("groupAvailable", () => {
  it("tells which groups make sense for a Position", () => {
    expect(groupAvailable("vs-open", "HJ", "early")).toBe(true);
    expect(groupAvailable("vs-open", "HJ", "late")).toBe(false);
    expect(groupAvailable("vs-limpers", "UTG+1", "2+")).toBe(false);
  });
});

describe("chartActions", () => {
  it("offers raise and fold when opening, plus limp from the SB", () => {
    expect(chartActions({ position: "CO", situation: "open", tier: "40bb+" }).map((action) => action.label)).toEqual(["Raise", "Fold"]);
    expect(chartActions({ position: "SB", situation: "open", tier: "40bb+" }).map((action) => action.id)).toEqual(["raise", "limp", "fold"]);
  });

  it("names the 3-bet, the iso-raise and the overlimp", () => {
    expect(chartActions({ opener: "late", position: "BTN", situation: "vs-open", tier: "25bb" }).map((action) => action.label)).toEqual(["3-bet", "Call", "Fold"]);
    expect(chartActions({ limpers: "1", position: "CO", situation: "vs-limpers", tier: "25bb" }).map((action) => action.label)).toEqual(["Iso-raise", "Overlimp", "Fold"]);
  });

  it("lets the BB check behind limpers instead of folding", () => {
    expect(chartActions({ limpers: "1", position: "BB", situation: "vs-limpers", tier: "25bb" }).map((action) => [action.id, action.label])).toEqual([
      ["raise", "Raise"],
      ["check", "Check"],
    ]);
  });

  it("marks the implicit remainder", () => {
    const actions = chartActions({ position: "SB", situation: "open", tier: "40bb+" });
    expect(actions.map((action) => action.remainder)).toEqual([false, false, true]);
    expect(actions.map((action) => action.colour)).toEqual(["raise", "call", "fold"]);
  });
});

describe("describeChart", () => {
  it("names the Chart in plain words", () => {
    expect(describeChart({ position: "CO", situation: "open", tier: "40bb+" })).toBe("CO open, 40bb+");
    expect(describeChart({ opener: "late", position: "BB", situation: "vs-open", tier: "15-20bb" })).toBe("BB vs late open, 15–20bb");
    expect(describeChart({ limpers: "2+", position: "SB", situation: "vs-limpers", tier: "25bb" })).toBe("SB vs 2+ limpers, 25bb");
    expect(describeChart({ limpers: "1", position: "BTN", situation: "vs-limpers", tier: "25bb" })).toBe("BTN vs 1 limper, 25bb");
  });
});

describe("chart URLs", () => {
  it("round-trips every key through its Ranges link", () => {
    for (const key of chartKeys()) {
      const href = chartHref(key);
      expect(href).toMatch(/^\/ranges(\?|$)/);
      expect(chartKeyFor(parseChartParams(new URLSearchParams(href.slice("/ranges".length))))).toEqual(key);
    }
  });

  it("leaves defaults out of the link", () => {
    expect(chartHref({ position: "CO", situation: "open", tier: "40bb+" })).toBe("/ranges?pos=CO");
  });

  it("falls back on unknown values", () => {
    expect(parseChartParams(new URLSearchParams("sit=nope&pos=XX&tier=1bb&opener=?&limpers=9"))).toEqual(selection({ position: "BTN" }));
  });
});

describe("selectionParams", () => {
  it("writes every picker value, leaving defaults out", () => {
    expect(selectionParams(selection({ opener: "late", position: "BTN", situation: "vs-open" }))).toEqual({ limpers: null, opener: "late", pos: null, sit: "vs-open", tier: null });
    expect(parseChartParams(new URLSearchParams(selectionParams(selection({ limpers: "2+", tier: "25bb" })) as Record<string, string>))).toEqual(
      selection({ limpers: "2+", tier: "25bb" }),
    );
  });
});
