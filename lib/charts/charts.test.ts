import { describe, expect, it } from "vitest";
import { COMBO_COUNT, handClassCombos, parseHandClass } from "@/lib/poker/combo";
import { handClassWeights, type Range } from "@/lib/poker/range";
import { POSITIONS, STACK_TIERS } from "@/lib/poker/table";
import { HU_PUSH_MAX_STACK, HU_PUSH_SHARE, headsUpMismatches } from "@/lib/push-fold/hrc-reference";
import { CHART_FILES, chartErrors, estimateRange, getChart, getPushFoldChart, PLAYER_TYPE_FILES, playerTypeChart, pushFoldFrequencies } from "./charts";
import { type ActionId, type ChartKey, chartKeys, heroPositions } from "./model";
import { PUSH_FOLD_DEPTHS, PUSH_POSITIONS, PUSHER_GROUPS, pushFoldKeys, pushFoldSeries } from "./push-fold";

const share = (range: Range | null) => (range ?? new Float64Array(COMBO_COUNT)).reduce((sum, weight) => sum + weight, 0) / COMBO_COUNT;
const weightOf = (range: Range | null, handClass: string) => handClassWeights(range ?? new Float64Array(COMBO_COUNT))[parseHandClass(handClass) ?? -1];
const actionRange = (key: ChartKey, id: ActionId) => getChart(key).actions.find((action) => action.id === id)?.range ?? null;

describe("repo Charts", () => {
  it("are all valid", () => {
    expect(chartErrors()).toEqual([]);
  });

  it("resolve every Situation, Position and Stack tier combination to a Chart", () => {
    for (const key of chartKeys()) expect(getChart(key).key).toEqual(key);
  });

  it("are marked as baseline starting points", () => {
    expect([CHART_FILES.open.baseline, CHART_FILES["vs-open"].baseline, CHART_FILES["vs-limpers"].baseline]).toEqual([true, true, true]);
    expect(getChart({ position: "CO", situation: "open", tier: "40bb+" }).baseline).toBe(true);
  });

  it("open wider from each later Position, with sensible sizes at the ends", () => {
    for (const tier of STACK_TIERS) {
      const shares = heroPositions("open").map((position) => share(actionRange({ position, situation: "open", tier }, "raise")));
      const playedFromSb = 1 - share(actionRange({ position: "SB", situation: "open", tier }, "fold"));
      const fromUtgToBtn = shares.slice(0, 6);
      expect(fromUtgToBtn).toEqual([...fromUtgToBtn].sort((a, b) => a - b));
      expect(shares[0]).toBeGreaterThan(0.1);
      expect(shares[0]).toBeLessThan(0.17);
      expect(shares[5]).toBeGreaterThan(0.38);
      expect(shares[5]).toBeLessThan(0.52);
      expect(playedFromSb).toBeGreaterThan(0.35);
    }
  });

  it("raise the premiums and fold the trash everywhere", () => {
    for (const key of chartKeys()) {
      expect(weightOf(actionRange(key, "raise"), "AA")).toBe(1);
      expect(weightOf(actionRange(key, "raise"), "KK")).toBe(1);
      if (key.position !== "BB") expect(weightOf(actionRange(key, "fold"), "72o")).toBe(1);
    }
  });

  it("let the BB check the rest behind limpers", () => {
    const chart = getChart({ limpers: "1", position: "BB", situation: "vs-limpers", tier: "40bb+" });
    expect(chart.actions.map((action) => action.id)).toEqual(["raise", "check"]);
    expect(weightOf(chart.actions[1].range, "72o")).toBe(1);
  });
});

describe("Player types", () => {
  const utgOpen = { position: "UTG", situation: "open", tier: "40bb+" } as const;
  const bbVsLate = { opener: "late", position: "BB", situation: "vs-open", tier: "40bb+" } as const;

  it("Standard equals the Charts", () => {
    for (const key of chartKeys()) expect(playerTypeChart("standard", key)).toBe(getChart(key));
  });

  it("Tight and Loose resolve for every Chart", () => {
    for (const key of chartKeys()) {
      for (const type of ["tight", "loose"] as const) expect(playerTypeChart(type, key).actions.length).toBeGreaterThan(1);
    }
  });

  it("Tight plays fewer hands than Standard, Loose plays more", () => {
    const played = (type: "tight" | "standard" | "loose", key: ChartKey) => 1 - share(estimateRange(type, key, "fold"));
    for (const position of heroPositions("open")) {
      const key = { position, situation: "open", tier: "40bb+" } as const;
      expect(played("tight", key)).toBeLessThan(played("standard", key));
      expect(played("loose", key)).toBeGreaterThan(played("standard", key));
    }
    expect(played("tight", bbVsLate)).toBeLessThan(played("standard", bbVsLate));
  });

  it("Loose limps and calls a lot but rarely raises", () => {
    expect(share(estimateRange("loose", utgOpen, "limp"))).toBeGreaterThan(0.15);
    expect(share(estimateRange("loose", utgOpen, "raise"))).toBeLessThan(share(estimateRange("standard", utgOpen, "raise")));
    expect(share(estimateRange("loose", bbVsLate, "call"))).toBeGreaterThan(0.3);
    expect(share(estimateRange("loose", bbVsLate, "raise"))).toBeLessThan(0.04);
  });

  it("gives no estimate for an action the Player type never takes", () => {
    expect(estimateRange("standard", utgOpen, "limp")).toBeNull();
    expect(estimateRange("tight", utgOpen, "call")).toBeNull();
  });

  it("estimates the BB's check behind limpers as everything it does not raise", () => {
    for (const type of ["tight", "standard", "loose"] as const) {
      const key = { limpers: "1", position: "BB", situation: "vs-limpers", tier: "25bb" } as const;
      expect(share(estimateRange(type, key, "check")) + share(estimateRange(type, key, "raise"))).toBeCloseTo(1, 9);
    }
  });

  it("cover every opening Position in the repo files", () => {
    for (const file of Object.values(PLAYER_TYPE_FILES)) expect(Object.keys(file.open).sort()).toEqual(POSITIONS.filter((position) => position !== "BB").sort());
  });
});

describe("repo Push/fold charts", () => {
  const shareAt = (frequencies: Float64Array) => frequencies.reduce((sum, f, cls) => sum + f * handClassCombos(cls).length, 0) / COMBO_COUNT;

  it("resolve every Position, pusher group and depth to a Chart", () => {
    for (const key of pushFoldKeys()) expect(getPushFoldChart(key).key).toEqual(key);
  });

  it("match the published heads-up Nash pushing ranges for the SB", () => {
    expect(headsUpMismatches("SB push", pushFoldFrequencies({ position: "SB", situation: "push" }), HU_PUSH_SHARE, HU_PUSH_MAX_STACK)).toEqual([]);
  });

  it("push wider from each later Position from 3bb up", () => {
    for (const depth of PUSH_FOLD_DEPTHS.filter((depth) => depth >= 3)) {
      const shares = PUSH_POSITIONS.map((position) => share(getPushFoldChart({ depth, position, situation: "push" }).actions[0].range));
      expect(shares).toEqual([...shares].sort((a, b) => a - b));
    }
  });

  it("tighten as stacks get deeper", () => {
    for (const series of pushFoldSeries()) {
      const shares = pushFoldFrequencies(series).map(shareAt);
      for (let index = 1; index < shares.length; index++) expect(shares[index]).toBeLessThanOrEqual(shares[index - 1] + 0.003);
    }
  });

  it("always push and call AA, and let the BB call wider than the SB", () => {
    for (const series of pushFoldSeries()) for (const frequencies of pushFoldFrequencies(series)) expect(frequencies[parseHandClass("AA") ?? -1]).toBe(1);
    for (const pusher of PUSHER_GROUPS) {
      for (const depth of PUSH_FOLD_DEPTHS.filter((depth) => depth >= 3)) {
        const calls = (position: "SB" | "BB") => share(getPushFoldChart({ depth, position, pusher, situation: "vs-push" }).actions[0].range);
        expect(calls("BB")).toBeGreaterThan(calls("SB"));
      }
    }
  });
});
