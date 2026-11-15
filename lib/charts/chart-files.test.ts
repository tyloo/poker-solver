import { describe, expect, it } from "vitest";
import { HAND_CLASS_COUNT, parseHandClass } from "@/lib/poker/combo";
import { handClassWeights } from "@/lib/poker/range";
import { type ActionRange, buildChart, type ChartFiles, chartEntry, chartFileLocation, validateChartFiles } from "./chart-files";
import { chartKeys } from "./model";

const raise = { raise: "" };
const raiseLimp = { limp: "", raise: "" };
const raiseCall = { call: "", raise: "" };

/** Valid but empty Chart files, to break one entry at a time. */
function emptyFiles(): ChartFiles {
  const open = { BTN: raise, CO: raise, HJ: raise, LJ: raise, SB: raiseLimp, UTG: raise, "UTG+1": raise };
  const vsOpen = {
    early: { BB: raiseCall, BTN: raiseCall, CO: raiseCall, HJ: raiseCall, LJ: raiseCall, SB: raiseCall, "UTG+1": raiseCall },
    late: { BB: raiseCall, BTN: raiseCall, SB: raiseCall },
    middle: { BB: raiseCall, BTN: raiseCall, CO: raiseCall, HJ: raiseCall, SB: raiseCall },
  };
  const vsLimpers = {
    "1": { BB: raise, BTN: raiseLimp, CO: raiseLimp, HJ: raiseLimp, LJ: raiseLimp, SB: raiseLimp, "UTG+1": raiseLimp },
    "2+": { BB: raise, BTN: raiseLimp, CO: raiseLimp, HJ: raiseLimp, LJ: raiseLimp, SB: raiseLimp },
  };
  const tiers = <T>(value: T): Record<"15-20bb" | "25bb" | "40bb+", T> => JSON.parse(JSON.stringify({ "15-20bb": value, "25bb": value, "40bb+": value }));
  return {
    open: { baseline: true, tiers: tiers(open) },
    "vs-limpers": { baseline: false, tiers: tiers(vsLimpers) },
    "vs-open": { baseline: true, tiers: tiers(vsOpen) },
  };
}

const weight = (action: ActionRange | undefined, handClass: string) => handClassWeights(action?.range ?? new Float64Array(1326))[parseHandClass(handClass) ?? -1];

describe("validateChartFiles", () => {
  it("accepts well-formed files", () => {
    expect(validateChartFiles(emptyFiles())).toEqual([]);
  });

  it("names the Chart and action of an invalid range string", () => {
    const files = emptyFiles();
    files.open.tiers["25bb"].CO = { raise: "22+, AKx" };
    expect(validateChartFiles(files)).toEqual(['CO open, 25bb: raise: Invalid entry "AKx"']);
  });

  it("rejects overlaps and frequencies summing above 1", () => {
    const files = emptyFiles();
    files["vs-open"].tiers["40bb+"].late.BB = { call: "AJo:0.5, 99+", raise: "AJo:0.7, QQ+" };
    files["vs-limpers"].tiers["15-20bb"]["2+"].SB = { limp: "", raise: "ATs+, AKs" };
    expect(validateChartFiles(files)).toEqual([
      "BB vs late open, 40bb+: AA: frequencies sum to 2 (raise 1, call 1)",
      "BB vs late open, 40bb+: KK: frequencies sum to 2 (raise 1, call 1)",
      "BB vs late open, 40bb+: QQ: frequencies sum to 2 (raise 1, call 1)",
      "BB vs late open, 40bb+: AJo: frequencies sum to 1.2 (raise 0.7, call 0.5)",
      'SB vs 2+ limpers, 15–20bb: raise: AKs appears twice: "AKs" overlaps an earlier entry',
    ]);
  });

  it("reports missing Charts and unexpected actions", () => {
    const files = emptyFiles();
    delete (files["vs-open"].tiers["25bb"].middle as Record<string, unknown>).HJ;
    (files.open.tiers["40bb+"].CO as Record<string, string>).call = "AA";
    expect(validateChartFiles(files)).toEqual(['CO open, 40bb+: unexpected action "call"', "HJ vs middle open, 25bb: missing Chart"]);
  });
});

describe("buildChart", () => {
  it("parses each action and adds the implicit fold", () => {
    const files = emptyFiles();
    files.open.tiers["40bb+"].SB = { limp: "AJo:0.5, 22+", raise: "AJo:0.25, AQo+" };
    const key = { position: "SB", situation: "open", tier: "40bb+" } as const;
    const chart = buildChart(key, chartEntry(files, key), files.open.baseline);
    expect(chart.baseline).toBe(true);
    expect(chart.actions.map((action) => action.id)).toEqual(["raise", "limp", "fold"]);
    const [raiseAction, limpAction, foldAction] = chart.actions;
    expect([weight(raiseAction, "AJo"), weight(limpAction, "AJo"), weight(foldAction, "AJo")]).toEqual([0.25, 0.5, 0.25]);
    expect([weight(raiseAction, "AKo"), weight(limpAction, "AKo"), weight(foldAction, "AKo")]).toEqual([1, 0, 0]);
    expect(weight(foldAction, "72o")).toBe(1);
  });

  it("gives the BB a check instead of a fold behind limpers", () => {
    const files = emptyFiles();
    files["vs-limpers"].tiers["25bb"]["1"].BB = { raise: "TT+" };
    const key = { limpers: "1", position: "BB", situation: "vs-limpers", tier: "25bb" } as const;
    const chart = buildChart(key, chartEntry(files, key), false);
    expect(chart.actions.map((action) => [action.id, weight(action, "AA"), weight(action, "72o")])).toEqual([
      ["raise", 1, 0],
      ["check", 0, 1],
    ]);
  });

  it("splits every Hand class completely between the actions", () => {
    const files = emptyFiles();
    for (const key of chartKeys()) {
      const chart = buildChart(key, chartEntry(files, key), true);
      const totals = new Float64Array(HAND_CLASS_COUNT);
      for (const action of chart.actions)
        handClassWeights(action.range).forEach((value, cls) => {
          totals[cls] += value;
        });
      expect([...totals].every((total) => Math.abs(total - 1) < 1e-9)).toBe(true);
    }
  });
});

describe("chartFileLocation", () => {
  it("points at the entry to edit", () => {
    expect(chartFileLocation({ position: "CO", situation: "open", tier: "40bb+" })).toBe('content/charts/open.ts, tiers["40bb+"].CO');
    expect(chartFileLocation({ opener: "late", position: "BB", situation: "vs-open", tier: "25bb" })).toBe('content/charts/vs-open.ts, tiers["25bb"].late.BB');
    expect(chartFileLocation({ limpers: "2+", position: "UTG+1", situation: "vs-limpers", tier: "15-20bb" })).toBe('content/charts/vs-limpers.ts, tiers["15-20bb"]["2+"]["UTG+1"]');
  });
});
