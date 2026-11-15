import { describe, expect, it } from "vitest";
import { HAND_CLASS_COUNT } from "@/lib/poker/combo";
import {
  browseParams,
  browseSeries,
  callerPositions,
  depthSpans,
  describePushFold,
  largestDepths,
  PUSH_FOLD_DEPTHS,
  PUSH_POSITIONS,
  type PushChartFile,
  type PushFoldFiles,
  parseBrowseParams,
  pushersFacing,
  pushFoldActions,
  pushFoldEntry,
  pushFoldFileLocation,
  pushFoldHref,
  pushFoldKeys,
  pushFoldSeries,
  pushFoldSeriesFor,
  type VsPushChartFile,
  validatePushFoldFiles,
} from "./push-fold";

function filesWith(push: string, call: string): PushFoldFiles {
  const pushDepth = Object.fromEntries(PUSH_POSITIONS.map((position) => [position, { push }]));
  const callers = (group: "early" | "middle" | "late") => Object.fromEntries(callerPositions(group).map((position) => [position, { call }]));
  return {
    push: { depths: Object.fromEntries(PUSH_FOLD_DEPTHS.map((depth) => [depth, pushDepth])) } as PushChartFile,
    "vs-push": {
      depths: Object.fromEntries(PUSH_FOLD_DEPTHS.map((depth) => [depth, { early: callers("early"), late: callers("late"), middle: callers("middle") }])),
    } as VsPushChartFile,
  };
}

describe("Push/fold Positions", () => {
  it("lets every Position but the BB push when folded to", () => {
    expect(PUSH_POSITIONS).toEqual(["UTG", "UTG+1", "LJ", "HJ", "CO", "BTN", "SB"]);
  });

  it("lets a caller face a pusher group only from behind its earliest Position", () => {
    expect(callerPositions("early")).toEqual(["UTG+1", "LJ", "HJ", "CO", "BTN", "SB", "BB"]);
    expect(callerPositions("middle")).toEqual(["HJ", "CO", "BTN", "SB", "BB"]);
    expect(callerPositions("late")).toEqual(["BTN", "SB", "BB"]);
  });

  it("averages a group over the pushers that act before the caller", () => {
    expect(pushersFacing("BB", "late")).toEqual(["CO", "BTN", "SB"]);
    expect(pushersFacing("SB", "late")).toEqual(["CO", "BTN"]);
    expect(pushersFacing("BTN", "late")).toEqual(["CO"]);
    expect(pushersFacing("UTG+1", "early")).toEqual(["UTG"]);
    expect(pushersFacing("CO", "middle")).toEqual(["LJ", "HJ"]);
  });
});

describe("pushFoldKeys", () => {
  it("covers every depth from 1 to 15bb for 7 Push and 15 Vs push series", () => {
    expect(PUSH_FOLD_DEPTHS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(pushFoldSeries()).toHaveLength(22);
    expect(pushFoldKeys()).toHaveLength(22 * 15);
  });
});

describe("pushFoldSeriesFor", () => {
  it("keeps valid choices", () => {
    expect(pushFoldSeriesFor({ position: "CO", pusher: "late", situation: "push" })).toEqual({ position: "CO", situation: "push" });
    expect(pushFoldSeriesFor({ position: "BB", pusher: "late", situation: "vs-push" })).toEqual({ position: "BB", pusher: "late", situation: "vs-push" });
  });

  it("moves impossible Positions and groups to the nearest valid ones", () => {
    expect(pushFoldSeriesFor({ position: "BB", pusher: "late", situation: "push" }).position).toBe("SB");
    expect(pushFoldSeriesFor({ position: "UTG", pusher: "early", situation: "vs-push" }).position).toBe("UTG+1");
    expect(pushFoldSeriesFor({ position: "HJ", pusher: "late", situation: "vs-push" })).toEqual({ position: "HJ", pusher: "middle", situation: "vs-push" });
  });
});

describe("Push/fold actions and names", () => {
  it("push or call all-in, with fold as the remainder", () => {
    expect(pushFoldActions("push").map((action) => [action.id, action.colour, action.remainder])).toEqual([
      ["push", "push", false],
      ["fold", "fold", true],
    ]);
    expect(pushFoldActions("vs-push").map((action) => [action.id, action.label])).toEqual([
      ["call", "Call"],
      ["fold", "Fold"],
    ]);
  });

  it("names series and Charts in plain words", () => {
    expect(describePushFold({ position: "CO", situation: "push" })).toBe("CO push");
    expect(describePushFold({ depth: 8, position: "BB", pusher: "late", situation: "vs-push" })).toBe("BB vs late push, 8bb");
  });

  it("points at the file entry", () => {
    expect(pushFoldFileLocation({ depth: 8, position: "UTG+1", situation: "push" })).toBe('content/charts/push.ts, depths[8]["UTG+1"]');
    expect(pushFoldFileLocation({ depth: 12, position: "BB", pusher: "late", situation: "vs-push" })).toBe("content/charts/vs-push.ts, depths[12].late.BB");
  });
});

describe("validatePushFoldFiles", () => {
  it("accepts complete files", () => {
    const files = filesWith("22+, A2s+", "QQ+, AKs");
    expect(validatePushFoldFiles(files)).toEqual([]);
    expect(pushFoldEntry(files, { depth: 3, position: "SB", situation: "push" })).toEqual({ push: "22+, A2s+" });
  });

  it("names the Chart of each problem", () => {
    const files = filesWith("22+", "QQ+");
    const broken = { ...files, push: { depths: { ...files.push.depths, 7: { ...files.push.depths[7], CO: { push: "AKx" } } } } } as PushFoldFiles;
    expect(validatePushFoldFiles(broken)).toEqual(['CO push, 7bb: push: Invalid entry "AKx"']);
    const missing = { ...files, "vs-push": { depths: { ...files["vs-push"].depths, 2: { ...files["vs-push"].depths[2], late: {} } } } } as PushFoldFiles;
    expect(validatePushFoldFiles(missing)).toEqual(["BTN vs late push, 2bb: missing Chart", "SB vs late push, 2bb: missing Chart", "BB vs late push, 2bb: missing Chart"]);
  });
});

describe("largestDepths and depthSpans", () => {
  const byDepth = (play: (depth: number) => number) => PUSH_FOLD_DEPTHS.map((depth) => new Float64Array(HAND_CLASS_COUNT).fill(play(depth)));

  it("finds the largest depth played at least half the time", () => {
    expect(largestDepths(byDepth((depth) => (depth <= 11 ? 1 : 0)))[0]).toBe(11);
    expect(largestDepths(byDepth(() => 1))[0]).toBe(15);
    expect(largestDepths(byDepth(() => 0.4))[0]).toBeNull();
    expect(largestDepths(byDepth((depth) => (depth === 12 ? 0.5 : depth < 12 ? 1 : 0)))[0]).toBe(12);
  });

  it("lists the depths played, gaps included", () => {
    expect(
      depthSpans(
        byDepth((depth) => (depth <= 11 ? 1 : 0)),
        0,
      ),
    ).toBe("1–11bb");
    expect(
      depthSpans(
        byDepth((depth) => (depth <= 2 || (depth >= 5 && depth <= 7) ? 1 : 0)),
        0,
      ),
    ).toBe("1–2bb and 5–7bb");
    expect(
      depthSpans(
        byDepth((depth) => (depth === 1 || depth === 4 || depth >= 9 ? 1 : 0)),
        0,
      ),
    ).toBe("1bb, 4bb and 9–15bb");
    expect(
      depthSpans(
        byDepth(() => 0),
        0,
      ),
    ).toBe("");
  });
});

describe("Ranges URLs for push/fold", () => {
  it("round-trip a push/fold selection through the query string", () => {
    for (const series of pushFoldSeries()) {
      const href = pushFoldHref(series);
      const selection = parseBrowseParams(new URLSearchParams(href.slice("/ranges?".length)));
      if (selection.situation !== "push" && selection.situation !== "vs-push") throw new Error(`${href} lost its Situation`);
      expect(browseSeries({ ...selection, situation: selection.situation })).toEqual(series);
    }
  });

  it("writes short links", () => {
    expect(pushFoldHref({ position: "CO", situation: "push" })).toBe("/ranges?pos=CO&sit=push");
    expect(pushFoldHref({ position: "BB", pusher: "late", situation: "vs-push" })).toBe("/ranges?opener=late&pos=BB&sit=vs-push");
  });

  it("leaves raising Charts to the Chart params", () => {
    const selection = parseBrowseParams(new URLSearchParams("sit=vs-open&pos=BB&opener=late"));
    expect(selection).toMatchObject({ opener: "late", position: "BB", situation: "vs-open" });
    expect(browseParams(selection)).toMatchObject({ opener: "late", pos: "BB", sit: "vs-open" });
  });
});
