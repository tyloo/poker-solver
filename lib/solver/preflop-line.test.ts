import { describe, expect, it } from "vitest";
import { getChart } from "@/lib/charts/charts";
import type { ActionId, ChartKey } from "@/lib/charts/model";
import type { Position } from "@/lib/poker/table";
import { callerPositions, describeLine, isValidLine, linePlayers, lineSpot, OPENER_POSITIONS, type OpenerPosition, type PreflopLine } from "./preflop-line";

const actionRange = (key: ChartKey, id: ActionId) => {
  const range = getChart(key).actions.find((action) => action.id === id)?.range;
  if (!range) throw new Error(`No ${id} in the Chart`);
  return range;
};

const open = (opener: OpenerPosition, caller: Position): PreflopLine => ({ caller, kind: "open", opener });

describe("callerPositions", () => {
  it("lists the Positions acting after the opener", () => {
    expect(callerPositions("UTG")).toEqual(["UTG+1", "LJ", "HJ", "CO", "BTN", "SB", "BB"]);
    expect(callerPositions("CO")).toEqual(["BTN", "SB", "BB"]);
    expect(callerPositions("SB")).toEqual(["BB"]);
  });

  it("every opener and caller pair resolves to Charts", () => {
    for (const opener of OPENER_POSITIONS) {
      for (const caller of callerPositions(opener)) {
        const result = lineSpot(open(opener, caller), 40);
        expect(result.ok, `${opener} vs ${caller}`).toBe(true);
      }
    }
  });
});

describe("isValidLine", () => {
  it("needs the caller after the opener", () => {
    expect(isValidLine(open("CO", "BB"))).toBe(true);
    expect(isValidLine(open("CO", "HJ"))).toBe(false);
    expect(isValidLine(open("CO", "CO"))).toBe(false);
    expect(isValidLine({ kind: "limp" })).toBe(true);
  });
});

describe("linePlayers", () => {
  it("orders the players OOP first: the blinds act first postflop, then in preflop order", () => {
    expect(linePlayers(open("CO", "BB"))).toEqual(["BB", "CO"]);
    expect(linePlayers(open("CO", "BTN"))).toEqual(["CO", "BTN"]);
    expect(linePlayers(open("BTN", "SB"))).toEqual(["SB", "BTN"]);
    expect(linePlayers(open("SB", "BB"))).toEqual(["SB", "BB"]);
    expect(linePlayers({ kind: "limp" })).toEqual(["SB", "BB"]);
  });
});

describe("lineSpot", () => {
  it("CO opens 2.5bb at 40bb and the BB calls: pot 5.5bb (SB dead), 37.5bb behind, Ranges from the Charts", () => {
    const result = lineSpot(open("CO", "BB"), 40);
    if (!result.ok) throw new Error(result.error);
    expect(result.tier).toBe("40bb+");
    expect(result.pot).toBe(5.5);
    expect(result.stack).toBe(37.5);
    expect(result.players).toEqual(["BB", "CO"]);
    expect(result.ranges[0]).toEqual(actionRange({ opener: "late", position: "BB", situation: "vs-open", tier: "40bb+" }, "call"));
    expect(result.ranges[1]).toEqual(actionRange({ position: "CO", situation: "open", tier: "40bb+" }, "raise"));
  });

  it("adds both blinds as dead money when neither player is in them", () => {
    const result = lineSpot(open("HJ", "BTN"), 50);
    if (!result.ok) throw new Error(result.error);
    expect(result.pot).toBe(6.5);
    expect(result.stack).toBe(47.5);
    expect(result.players).toEqual(["HJ", "BTN"]);
    expect(result.ranges[0]).toEqual(actionRange({ position: "HJ", situation: "open", tier: "40bb+" }, "raise"));
    expect(result.ranges[1]).toEqual(actionRange({ opener: "middle", position: "BTN", situation: "vs-open", tier: "40bb+" }, "call"));
  });

  it("uses the 2bb open and the 25bb Charts between 21 and 32bb", () => {
    const result = lineSpot(open("BTN", "SB"), 25);
    if (!result.ok) throw new Error(result.error);
    expect(result.tier).toBe("25bb");
    expect(result.pot).toBe(5);
    expect(result.stack).toBe(23);
    expect(result.ranges[0]).toEqual(actionRange({ opener: "late", position: "SB", situation: "vs-open", tier: "25bb" }, "call"));
  });

  it("SB opens and the BB calls: no dead money", () => {
    const result = lineSpot(open("SB", "BB"), 18);
    if (!result.ok) throw new Error(result.error);
    expect(result.tier).toBe("15-20bb");
    expect(result.pot).toBe(4);
    expect(result.stack).toBe(16);
  });

  it("SB limps and the BB checks: pot 2bb, the SB limp Range against the BB's checking Range", () => {
    const result = lineSpot({ kind: "limp" }, 40);
    if (!result.ok) throw new Error(result.error);
    expect(result.pot).toBe(2);
    expect(result.stack).toBe(39);
    expect(result.ranges[0]).toEqual(actionRange({ position: "SB", situation: "open", tier: "40bb+" }, "limp"));
    expect(result.ranges[1]).toEqual(actionRange({ limpers: "1", position: "BB", situation: "vs-limpers", tier: "40bb+" }, "check"));
  });

  it("uses the real blinds: at level 1 (50/50) the SB puts in a full 1bb", () => {
    const level1 = { bb: 50, sb: 50 };
    const blinds = (line: PreflopLine, depth: number) => {
      const result = lineSpot(line, depth, level1);
      if (!result.ok) throw new Error(result.error);
      return { pot: result.pot, stack: result.stack };
    };
    expect(blinds(open("CO", "BB"), 40)).toEqual({ pot: 6, stack: 37.5 });
    expect(blinds(open("HJ", "BTN"), 50)).toEqual({ pot: 7, stack: 47.5 });
    expect(blinds(open("BTN", "SB"), 25)).toEqual({ pot: 5, stack: 23 });
    expect(blinds(open("SB", "BB"), 18)).toEqual({ pot: 4, stack: 16 });
    expect(blinds({ kind: "limp" }, 40)).toEqual({ pot: 2, stack: 39 });
  });

  it("takes the SB as half the BB when no Blind level is given, and at any level where it is", () => {
    const at = (level: { sb: number; bb: number }) => {
      const result = lineSpot(open("CO", "BB"), 40, level);
      return result.ok ? result.pot : Number.NaN;
    };
    expect(at({ bb: 100, sb: 50 })).toBe(5.5);
    expect(at({ bb: 2000, sb: 1000 })).toBe(5.5);
  });

  it("refuses depths below 15bb, where the Push/fold charts apply", () => {
    expect(lineSpot(open("CO", "BB"), 12)).toEqual({ error: expect.stringMatching(/15bb/), ok: false });
  });

  it("refuses a caller who acts before the opener", () => {
    expect(lineSpot(open("CO", "HJ"), 40).ok).toBe(false);
  });
});

describe("describeLine", () => {
  it("names the line in plain words", () => {
    expect(describeLine(open("CO", "BB"), 40, "en")).toBe("CO opens 2.5bb, BB calls, 40bb");
    expect(describeLine(open("BTN", "SB"), 22.5, "en")).toBe("BTN opens 2bb, SB calls, 22.5bb");
    expect(describeLine({ kind: "limp" }, 30, "en")).toBe("SB limps, BB checks, 30bb");
    expect(describeLine(open("CO", "BB"), 40, "fr")).toBe("CO ouvre à 2,5bb, BB calle, 40bb");
    expect(describeLine({ kind: "limp" }, 30, "fr")).toBe("SB limpe, BB checke, 30bb");
  });
});
