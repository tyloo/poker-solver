import { describe, expect, it } from "vitest";
import { pushFoldEntry, validatePushFoldFiles } from "@/lib/charts/push-fold";
import { HAND_CLASS_COUNT, parseHandClass } from "@/lib/poker/combo";
import { chartFrequency, frequencyString, pushFoldFilesFrom, pushFoldSources } from "./chart-data";
import { foldedTo, type PushFoldSolution } from "./nash";

const cls = (name: string) => parseHandClass(name) ?? -1;

function frequencies(entries: Record<string, number>): Float64Array {
  const result = new Float64Array(HAND_CLASS_COUNT);
  for (const [name, value] of Object.entries(entries)) result[cls(name)] = value;
  return result;
}

describe("chartFrequency", () => {
  it("drops small mixes, snaps near-pure play and rounds the rest to 5%", () => {
    expect([0, 0.04, 0.099, 0.1, 0.12, 0.474, 0.475, 0.6, 0.9, 0.93, 1].map(chartFrequency)).toEqual([0, 0, 0, 0.1, 0.1, 0.45, 0.5, 0.6, 0.9, 1, 1]);
  });
});

describe("frequencyString", () => {
  it("writes rounded Hand class frequencies as a range string", () => {
    expect(frequencyString(frequencies({ AA: 1, AKs: 0.52, KK: 0.97, QQ: 0.03 }))).toBe("KK+, AKs:0.5");
    expect(frequencyString(new Float64Array(HAND_CLASS_COUNT))).toBe("");
  });
});

describe("pushFoldFilesFrom", () => {
  // Every pusher pushes AA plus its own marker hand; a caller vs CO calls AA, vs BTN never, vs SB half the time.
  const marker = { BTN: "65s", CO: "76s", HJ: "87s", LJ: "98s", SB: "54s", UTG: "JTs", "UTG+1": "T9s" } as const;
  const callFrequency = { BTN: 0, CO: 1, SB: 0.5 } as Record<string, number>;
  const solve = (depth: number, pusher: keyof typeof marker): PushFoldSolution => {
    const { callers } = foldedTo(pusher, depth);
    return {
      calls: callers.map(() => frequencies({ AA: callFrequency[pusher] ?? 1 })),
      gaps: { callers: callers.map(() => 0), pusher: 0 },
      push: frequencies({ AA: 1, [marker[pusher]]: depth <= 5 ? 1 : 0 }),
    };
  };
  const files = pushFoldFilesFrom(solve);

  it("writes a valid entry for every Push and Vs push chart", () => {
    expect(validatePushFoldFiles(files)).toEqual([]);
  });

  it("copies each pusher's solved range into its Push chart", () => {
    expect(pushFoldEntry(files, { depth: 4, position: "CO", situation: "push" })).toEqual({ push: "AA, 76s" });
    expect(pushFoldEntry(files, { depth: 9, position: "UTG+1", situation: "push" })).toEqual({ push: "AA" });
  });

  it("averages the call frequencies solved against each pusher of the group", () => {
    expect(pushFoldEntry(files, { depth: 6, pusher: "late", position: "BB", situation: "vs-push" })).toEqual({ call: "AA:0.5" });
    expect(pushFoldEntry(files, { depth: 6, pusher: "late", position: "SB", situation: "vs-push" })).toEqual({ call: "AA:0.5" });
    expect(pushFoldEntry(files, { depth: 6, pusher: "late", position: "BTN", situation: "vs-push" })).toEqual({ call: "AA" });
    expect(pushFoldEntry(files, { depth: 6, pusher: "middle", position: "BB", situation: "vs-push" })).toEqual({ call: "AA" });
  });
});

describe("pushFoldSources", () => {
  it("renders both Chart files as TypeScript", () => {
    const empty = () => ({ calls: [], gaps: { callers: [], pusher: 0 }, push: new Float64Array(HAND_CLASS_COUNT) });
    const files = pushFoldFilesFrom((depth, pusher) => ({ ...empty(), calls: foldedTo(pusher, depth).callers.map(() => new Float64Array(HAND_CLASS_COUNT)) }));
    const sources = pushFoldSources(files, 3000);
    expect(sources.push).toContain('import type { PushChartFile } from "@/lib/charts/push-fold";');
    expect(sources.push).toContain("export const PUSH_CHARTS: PushChartFile = {");
    expect(sources.push).toContain('"UTG+1": { push: "" }');
    expect(sources["vs-push"]).toContain("export const VS_PUSH_CHARTS: VsPushChartFile = {");
    expect(sources["vs-push"]).toContain("3000 iterations");
    expect(pushFoldSources(files, 3000)).toEqual(sources);
  });
});
