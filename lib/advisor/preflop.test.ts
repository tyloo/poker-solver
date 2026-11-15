import { describe, expect, it } from "vitest";
import { getChart, getPushFoldChart } from "@/lib/charts/charts";
import type { Locale } from "@/lib/i18n/locale";
import { type CardId, cardId, parseCards } from "@/lib/poker/card";
import { comboId } from "@/lib/poker/combo";
import { advisePreflop, limperGroupsFor, type PreflopAdvice, type PreflopQuestion, positionsBefore, verdictSize } from "./preflop";

const hand = (text: string): [CardId, CardId] => {
  const cards = parseCards(text);
  if (cards?.length !== 2) throw new Error(`Bad hand ${text}`);
  return [cardId(cards[0]), cardId(cards[1])];
};

const question = (overrides: Partial<PreflopQuestion>): PreflopQuestion => ({
  depth: 50,
  hand: hand("AsKd"),
  players: 8,
  position: "CO",
  situation: { kind: "folded" },
  ...overrides,
});

function advice(input: Partial<PreflopQuestion>, locale: Locale = "en"): Extract<PreflopAdvice, { kind: "advice" }> {
  const result = advisePreflop(question(input), locale);
  if (result.kind !== "advice") throw new Error(`Expected advice, got ${JSON.stringify(result)}`);
  return result;
}

describe("positionsBefore", () => {
  it("lists the Positions at the table that act before the hero preflop", () => {
    expect(positionsBefore(8, "CO")).toEqual(["UTG", "UTG+1", "LJ", "HJ"]);
    expect(positionsBefore(6, "CO")).toEqual(["LJ", "HJ"]);
    expect(positionsBefore(6, "LJ")).toEqual([]);
    expect(positionsBefore(3, "BB")).toEqual(["BTN", "SB"]);
  });
});

describe("limperGroupsFor", () => {
  it("needs one Position before the hero per limper", () => {
    expect(limperGroupsFor(8, "UTG")).toEqual([]);
    expect(limperGroupsFor(8, "UTG+1")).toEqual(["1"]);
    expect(limperGroupsFor(8, "LJ")).toEqual(["1", "2+"]);
    expect(limperGroupsFor(6, "HJ")).toEqual(["1"]);
    expect(limperGroupsFor(2, "BB")).toEqual(["1"]);
  });
});

describe("Stack tier resolution", () => {
  it("follows the spec boundaries: ≥33 / 21–32 / 15–20 / below 15", () => {
    const tierOf = (depth: number) => {
      const { chart } = advice({ depth });
      return chart.kind === "chart" ? chart.key.tier : `push ${chart.key.depth}bb`;
    };
    expect(tierOf(200)).toBe("40bb+");
    expect(tierOf(33)).toBe("40bb+");
    expect(tierOf(32)).toBe("25bb");
    expect(tierOf(21)).toBe("25bb");
    expect(tierOf(20)).toBe("15-20bb");
    expect(tierOf(15)).toBe("15-20bb");
    expect(tierOf(14.9)).toBe("push 15bb");
    expect(tierOf(14)).toBe("push 14bb");
    expect(tierOf(9.4)).toBe("push 9bb");
    expect(tierOf(0.3)).toBe("push 1bb");
  });
});

describe("advisePreflop: Chart lookup", () => {
  it("uses the Open Chart when folded to the hero", () => {
    const result = advice({ depth: 18 });
    expect(result.chart).toEqual({ key: { position: "CO", situation: "open", tier: "15-20bb" }, kind: "chart" });
    expect(result.href).toBe("/ranges?pos=CO&tier=15-20bb");
    expect(result.context).toBe("AKo in CO, 15–20bb, folded to you");
  });

  it("writes the context and Chart name in French", () => {
    const folded = advice({ depth: 18 }, "fr");
    expect(folded.context).toBe("AKo en CO, 15–20bb, couché jusqu’à toi");
    expect(folded.chartTitle).toBe("Open en CO, 15–20bb");
    expect(advice({ depth: 9.5, position: "BB", situation: { kind: "push", pusher: "CO" } }, "fr").context).toBe("AKo en BB, 10bb, CO a pushé");
  });

  it("reads the frequencies of the hero's Combo from the Chart", () => {
    const result = advice({ hand: hand("7c2d"), position: "UTG" });
    expect(result.actions.map((action) => [action.id, action.frequency])).toEqual([
      ["raise", 0],
      ["fold", 1],
    ]);
    expect(result.verdict.action.id).toBe("fold");

    const chart = getChart({ position: "BTN", situation: "open", tier: "40bb+" });
    const combo = comboId(...hand("Ah5h"));
    const expected = chart.actions.map((action) => action.range[combo]);
    expect(advice({ hand: hand("Ah5h"), position: "BTN" }).actions.map((action) => action.frequency)).toEqual(expected);
  });

  it("offers the SB limp", () => {
    const result = advice({ position: "SB" });
    expect(result.actions.map((action) => action.id)).toEqual(["raise", "limp", "fold"]);
  });

  it("uses the Vs open Chart with the opener's group", () => {
    const result = advice({ depth: 25, position: "BTN", situation: { kind: "open", opener: "HJ" } });
    expect(result.chart).toEqual({ key: { opener: "middle", position: "BTN", situation: "vs-open", tier: "25bb" }, kind: "chart" });
    expect(result.context).toBe("AKo in BTN, 25bb, HJ opened");
  });

  it("uses the Vs limpers Chart, the BB facing an SB limp included", () => {
    expect(advice({ position: "BTN", situation: { kind: "limps", limpers: "2+" } }).chart).toEqual({
      key: { limpers: "2+", position: "BTN", situation: "vs-limpers", tier: "40bb+" },
      kind: "chart",
    });
    const bb = advice({ hand: hand("7c2d"), players: 2, position: "BB", situation: { kind: "limps", limpers: "1" } });
    expect(bb.chart).toEqual({ key: { limpers: "1", position: "BB", situation: "vs-limpers", tier: "40bb+" }, kind: "chart" });
    expect(bb.verdict.action.id).toBe("check");
    expect(bb.context).toBe("72o in BB, 40bb+, 1 limper before you");
  });

  it("uses the Push chart below 15bb when folded to the hero", () => {
    const result = advice({ depth: 8, position: "BTN" });
    expect(result.chart).toEqual({ key: { depth: 8, position: "BTN", situation: "push" }, kind: "push-fold" });
    expect(result.verdict.action.id).toBe("push");
    expect(result.href).toBe("/ranges?sit=push");
    expect(advice({ depth: 8, position: "CO" }).href).toBe("/ranges?pos=CO&sit=push");
    expect(result.context).toBe("AKo in BTN, 8bb, folded to you");
  });

  it("uses the Vs push chart with the pusher's group", () => {
    const result = advice({ depth: 10, hand: hand("AhAd"), position: "BB", situation: { kind: "push", pusher: "CO" } });
    expect(result.chart).toEqual({ key: { depth: 10, position: "BB", pusher: "late", situation: "vs-push" }, kind: "push-fold" });
    expect(result.verdict.action.id).toBe("call");
    expect(result.context).toBe("AA in BB, 10bb, CO pushed");
    const call = getPushFoldChart({ depth: 10, position: "BB", pusher: "late", situation: "vs-push" }).actions[0].range;
    expect(result.actions[0].frequency).toBe(call[comboId(...hand("AhAd"))]);
  });

  it("caps Vs push at the deepest chart and says so", () => {
    const result = advice({ depth: 40, position: "BB", situation: { kind: "push", pusher: "UTG" } });
    expect(result.chart).toEqual({ key: { depth: 15, position: "BB", pusher: "early", situation: "vs-push" }, kind: "push-fold" });
    expect(result.note).toMatch(/15bb/);
  });

  it("falls back to the 15–20bb Charts below 15bb when facing an open or limpers", () => {
    const result = advice({ depth: 12, position: "BTN", situation: { kind: "open", opener: "CO" } });
    expect(result.chart).toEqual({ key: { opener: "late", position: "BTN", situation: "vs-open", tier: "15-20bb" }, kind: "chart" });
    expect(result.note).toMatch(/15–20bb/);
    expect(result.context).toBe("AKo in BTN, 12bb, CO opened");
  });

  it("marks seeded Charts as baseline", () => {
    expect(advice({}).baseline).toBe(true);
    expect(advice({ depth: 8 }).baseline).toBe(false);
  });
});

describe("advisePreflop: impossible inputs", () => {
  it("gives the walk when folded to the BB", () => {
    expect(advisePreflop(question({ position: "BB" }), "en")).toEqual({ kind: "walk", reason: "Folded to you in the BB: you win the blinds." });
  });

  it("rejects Positions that are not at the table", () => {
    expect(advisePreflop(question({ players: 6, position: "UTG" }), "en").kind).toBe("invalid");
  });

  it("needs the opener or pusher to act before the hero", () => {
    expect(advisePreflop(question({ position: "CO", situation: { kind: "open", opener: "BTN" } }), "en").kind).toBe("invalid");
    expect(advisePreflop(question({ position: "CO", situation: { kind: "push", pusher: "CO" } }), "en").kind).toBe("invalid");
    expect(advisePreflop(question({ players: 6, position: "CO", situation: { kind: "open", opener: "UTG" } }), "en").kind).toBe("invalid");
  });

  it("needs enough Positions before the hero for the limpers", () => {
    expect(advisePreflop(question({ position: "UTG+1", situation: { kind: "limps", limpers: "2+" } }), "en").kind).toBe("invalid");
    expect(advisePreflop(question({ position: "UTG", situation: { kind: "limps", limpers: "1" } }), "en").kind).toBe("invalid");
  });

  it("needs a positive stack", () => {
    expect(advisePreflop(question({ depth: 0 }), "en").kind).toBe("invalid");
    expect(advisePreflop(question({ depth: Number.NaN }), "en").kind).toBe("invalid");
  });
});

describe("verdict sizes", () => {
  const size = (input: Partial<PreflopQuestion>, bigBlind?: number) => {
    const { verdict } = advice(input);
    return [verdict.title, verdictSize(verdict, "en", bigBlind)];
  };

  it("opens to the tier's open size, in chips when the Blind level is known", () => {
    expect(size({ depth: 50, hand: hand("AsAd") })).toEqual(["Raise", "to 2.5bb"]);
    expect(size({ depth: 50, hand: hand("AsAd") }, 200)).toEqual(["Raise", "to 2.5bb (500 chips)"]);
    expect(size({ depth: 25, hand: hand("AsAd") }, 50)).toEqual(["Raise", "to 2bb (100 chips)"]);
  });

  it("3-bets to 3× in position and 4× from the blinds at 40bb+, all-in at 25bb and below", () => {
    expect(size({ hand: hand("AsAd"), position: "BTN", situation: { kind: "open", opener: "CO" } })).toEqual(["3-bet", "to 7.5bb"]);
    expect(size({ hand: hand("AsAd"), position: "BB", situation: { kind: "open", opener: "CO" } })).toEqual(["3-bet", "to 10bb"]);
    expect(size({ depth: 25, hand: hand("AsAd"), position: "BTN", situation: { kind: "open", opener: "CO" } })).toEqual(["3-bet", "all-in"]);
  });

  it("iso-raises to 3bb plus 1bb per limper (+1bb from the blinds), all-in at 15–20bb", () => {
    expect(size({ hand: hand("AsAd"), position: "BTN", situation: { kind: "limps", limpers: "1" } })).toEqual(["Iso-raise", "to 4bb"]);
    expect(size({ hand: hand("AsAd"), position: "BTN", situation: { kind: "limps", limpers: "2+" } })).toEqual(["Iso-raise", "to 5bb"]);
    expect(size({ hand: hand("AsAd"), position: "BB", situation: { kind: "limps", limpers: "1" } })).toEqual(["Raise", "to 5bb"]);
    expect(size({ depth: 18, hand: hand("AsAd"), position: "BTN", situation: { kind: "limps", limpers: "1" } })).toEqual(["Iso-raise", "all-in"]);
  });

  it("pushes and calls all-in on the Push/fold charts", () => {
    expect(size({ depth: 8, hand: hand("AsAd"), position: "BTN" })).toEqual(["Push", "all-in"]);
    expect(size({ depth: 8, hand: hand("AsAd"), position: "BB", situation: { kind: "push", pusher: "BTN" } })).toEqual(["Call", "all-in"]);
  });

  it("speaks French", () => {
    const { verdict } = advice({ depth: 50, hand: hand("AsAd") }, "fr");
    expect([verdict.title, verdictSize(verdict, "fr", 200)]).toEqual(["Relancer", "à 2,5bb (500 jetons)"]);
    const allIn = advice({ depth: 25, hand: hand("AsAd"), position: "BTN", situation: { kind: "open", opener: "CO" } }, "fr").verdict;
    expect([allIn.title, verdictSize(allIn, "fr")]).toEqual(["3-bet", "tapis"]);
  });

  it("has no size for folds, calls, limps and checks", () => {
    expect(size({ hand: hand("7c2d") })).toEqual(["Fold", null]);
    expect(size({ hand: hand("7c2d"), players: 2, position: "BB", situation: { kind: "limps", limpers: "1" } })).toEqual(["Check", null]);
  });
});
