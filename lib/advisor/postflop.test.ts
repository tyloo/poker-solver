import { describe, expect, it } from "vitest";
import { estimateRange, getChart } from "@/lib/charts/charts";
import type { ActionId, ChartKey } from "@/lib/charts/model";
import type { PlayerType } from "@/lib/charts/player-types";
import { type CardId, cardId, parseCards } from "@/lib/poker/card";
import { formatRange } from "@/lib/poker/range";
import { parseSpotParams, solverHref } from "@/lib/solver/spot-url";
import { defaultOpponents, LOW_SPR, opponentPositions, opponentRange, type PostflopLine, postflopLine, postflopNumbers, postflopVerdict, solverLinkFor } from "./postflop";
import { advisePreflop, type PreflopQuestion } from "./preflop";

const cards = (text: string): CardId[] => (parseCards(text) ?? []).map(cardId);
const hand = (text: string) => cards(text) as [CardId, CardId];

const question = (overrides: Partial<PreflopQuestion>): PreflopQuestion => ({
  depth: 50,
  hand: hand("AsKd"),
  players: 8,
  position: "CO",
  situation: { kind: "folded" },
  ...overrides,
});

function line(overrides: Partial<PreflopQuestion>): PostflopLine {
  const input = question(overrides);
  const result = postflopLine(input, advisePreflop(input, "en"), "en");
  if (!result.ok) throw new Error(result.reason);
  return result.line;
}

const estimate = (type: PlayerType, key: ChartKey, action: ActionId) => {
  const range = estimateRange(type, key, action);
  if (!range) throw new Error("No range");
  return range;
};

function rangeOf(postflop: PostflopLine, position: PreflopQuestion["position"], type: PlayerType = "standard") {
  const result = opponentRange(postflop, { position, type }, "en");
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe("postflopNumbers", () => {
  it("works out pot odds, required equity and SPR facing a bet", () => {
    const numbers = postflopNumbers({ bet: 50, pot: 100, stack: 400 });
    expect(numbers.call).toBe(50);
    expect(numbers.potOdds).toBe(3);
    expect(numbers.requiredEquity).toBeCloseTo(0.25, 12);
    expect(numbers.spr).toBe(4);
  });

  it("caps the call at the hero's stack; the uncalled part of the bet goes back", () => {
    const numbers = postflopNumbers({ bet: 500, pot: 100, stack: 200 });
    expect(numbers.call).toBe(200);
    expect(numbers.requiredEquity).toBeCloseTo(0.4, 12);
    expect(numbers.potOdds).toBe(1.5);
  });

  it("needs no equity to check", () => {
    const numbers = postflopNumbers({ bet: 0, pot: 120, stack: 600 });
    expect(numbers.call).toBe(0);
    expect(numbers.requiredEquity).toBe(0);
    expect(numbers.spr).toBe(5);
  });
});

describe("postflopVerdict", () => {
  const verdict = (equity: number, input: { pot: number; bet: number; stack: number }, opponents = 1) => postflopVerdict({ equity, opponents, ...input }, "en").kind;

  it("calls or folds facing a bet by pot odds", () => {
    expect(verdict(0.26, { bet: 50, pot: 100, stack: 1000 })).toBe("call");
    expect(verdict(0.24, { bet: 50, pot: 100, stack: 1000 })).toBe("fold");
  });

  it("pushes instead of calling when the SPR is low", () => {
    expect(verdict(0.5, { bet: 50, pot: 100, stack: 100 * LOW_SPR })).toBe("push");
    expect(verdict(0.5, { bet: 50, pot: 100, stack: 100 * LOW_SPR + 1 })).toBe("call");
    expect(verdict(0.2, { bet: 50, pot: 100, stack: 150 })).toBe("fold");
  });

  it("calls when calling already puts the hero all-in", () => {
    expect(verdict(0.5, { bet: 300, pot: 100, stack: 150 })).toBe("call");
  });

  it("bets first to act when equity is well above a fair share, otherwise checks", () => {
    expect(verdict(0.61, { bet: 0, pot: 100, stack: 1000 })).toBe("bet");
    expect(verdict(0.59, { bet: 0, pot: 100, stack: 1000 })).toBe("check");
    expect(verdict(0.44, { bet: 0, pot: 100, stack: 1000 }, 2)).toBe("bet");
    expect(verdict(0.42, { bet: 0, pot: 100, stack: 1000 }, 2)).toBe("check");
  });

  it("labels itself as a heuristic with a reason", () => {
    const result = postflopVerdict({ bet: 50, equity: 0.3, opponents: 1, pot: 100, stack: 1000 }, "en");
    expect(result.title).toBe("Call");
    expect(result.reason).toBe("30% equity beats the 25% the price needs.");
    const french = postflopVerdict({ bet: 50, equity: 0.2, opponents: 1, pot: 100, stack: 1000 }, "fr");
    expect(french.title).toBe("Se coucher");
    expect(french.reason).toBe("20\u00a0% d’équité, c’est moins que les 25\u00a0% qu’exige la cote.");
  });
});

describe("postflopLine", () => {
  it("has no postflop after an all-in or a walk", () => {
    const pushed = question({ depth: 8 });
    expect(postflopLine(pushed, advisePreflop(pushed, "en"), "en").ok).toBe(false);
    const vsPush = question({ depth: 8, position: "BB", situation: { kind: "push", pusher: "BTN" } });
    expect(postflopLine(vsPush, advisePreflop(vsPush, "en"), "en").ok).toBe(false);
    const walk = question({ position: "BB" });
    expect(postflopLine(walk, advisePreflop(walk, "en"), "en").ok).toBe(false);
  });

  it("assumes the hero entered the pot with the Chart's most frequent action other than fold", () => {
    expect(line({}).heroAction).toBe("raise");
    expect(line({ hand: hand("7c2d") }).heroAction).toBe("raise");
    expect(line({ hand: hand("8c8d"), position: "BTN", situation: { kind: "open", opener: "CO" } }).heroAction).toBe("call");
    expect(line({ hand: hand("AcAd"), position: "BTN", situation: { kind: "open", opener: "CO" } }).heroAction).toBe("raise");
    expect(line({ hand: hand("7c2d"), players: 2, position: "BB", situation: { kind: "limps", limpers: "1" } }).heroAction).toBe("check");
  });

  it("uses the 15–20bb Charts for short stacks that still see a flop", () => {
    expect(line({ depth: 10, position: "BB", situation: { kind: "limps", limpers: "1" } }).key.tier).toBe("15-20bb");
  });
});

describe("opponents", () => {
  it("lists the Positions that can still be in the pot", () => {
    expect(opponentPositions(line({ position: "CO" }))).toEqual(["BTN", "SB", "BB"]);
    expect(opponentPositions(line({ position: "BTN", situation: { kind: "open", opener: "HJ" } }))).toEqual(["HJ", "CO", "SB", "BB"]);
    expect(opponentPositions(line({ players: 6, position: "CO", situation: { kind: "limps", limpers: "1" } }))).toEqual(["LJ", "HJ", "BTN", "SB", "BB"]);
  });

  it("defaults to the BB calling an open, the opener, or the limpers just before the hero", () => {
    expect(defaultOpponents(line({}))).toEqual(["BB"]);
    expect(defaultOpponents(line({ position: "BTN", situation: { kind: "open", opener: "HJ" } }))).toEqual(["HJ"]);
    expect(defaultOpponents(line({ position: "CO", situation: { kind: "limps", limpers: "1" } }))).toEqual(["HJ"]);
    expect(defaultOpponents(line({ position: "CO", situation: { kind: "limps", limpers: "2+" } }))).toEqual(["LJ", "HJ"]);
  });
});

describe("opponentRange", () => {
  it("callers of the hero's open use their Vs open call Range", () => {
    const result = rangeOf(line({ position: "CO" }), "BB", "loose");
    expect(result.range).toEqual(estimate("loose", { opener: "late", position: "BB", situation: "vs-open", tier: "40bb+" }, "call"));
    expect(result.line).toBe("called your open");
  });

  it("the BB checks behind an SB limp", () => {
    const sb = line({ hand: hand("9c8d"), position: "SB" });
    expect(sb.heroAction).toBe("limp");
    const result = rangeOf(sb, "BB", "tight");
    expect(result.range).toEqual(estimate("tight", { limpers: "1", position: "BB", situation: "vs-limpers", tier: "40bb+" }, "check"));
    expect(result.line).toBe("checked");
  });

  it("the opener uses their open Range and later callers their Vs open call Range", () => {
    const postflop = line({ depth: 25, hand: hand("8c8d"), position: "BTN", situation: { kind: "open", opener: "HJ" } });
    expect(rangeOf(postflop, "HJ", "tight").range).toEqual(estimate("tight", { position: "HJ", situation: "open", tier: "25bb" }, "raise"));
    expect(rangeOf(postflop, "HJ").line).toBe("opened");
    expect(rangeOf(postflop, "BB").range).toEqual(estimate("standard", { opener: "middle", position: "BB", situation: "vs-open", tier: "25bb" }, "call"));
  });

  it("after a 3-bet the opener keeps their open Range, with a note", () => {
    const result = rangeOf(line({ hand: hand("AcAd"), position: "BTN", situation: { kind: "open", opener: "CO" } }), "CO");
    expect(result.line).toBe("called your 3-bet");
    expect(result.note).toMatch(/open Range/);
  });

  it("limpers use their open limp Range, or their overlimp Range when they never open-limp", () => {
    const postflop = line({ hand: hand("7c2d"), position: "BB", situation: { kind: "limps", limpers: "1" } });
    const loose = rangeOf(postflop, "UTG", "loose");
    expect(loose.range).toEqual(estimate("loose", { position: "UTG", situation: "open", tier: "40bb+" }, "limp"));
    expect(loose.note).toBeNull();
    const tight = rangeOf(postflop, "UTG", "tight");
    expect(tight.range).toEqual(estimate("tight", { limpers: "1", position: "UTG+1", situation: "vs-limpers", tier: "40bb+" }, "limp"));
    expect(tight.note).toMatch(/overlimp/);
  });

  it("players behind an overlimp overlimp or check, behind an iso-raise they call", () => {
    const overlimp = line({ hand: hand("5c5d"), position: "HJ", situation: { kind: "limps", limpers: "1" } });
    expect(overlimp.heroAction).toBe("limp");
    expect(rangeOf(overlimp, "BB").range).toEqual(estimate("standard", { limpers: "2+", position: "BB", situation: "vs-limpers", tier: "40bb+" }, "check"));
    expect(rangeOf(overlimp, "BTN").range).toEqual(estimate("standard", { limpers: "2+", position: "BTN", situation: "vs-limpers", tier: "40bb+" }, "limp"));

    const iso = line({ hand: hand("AcAd"), position: "HJ", situation: { kind: "limps", limpers: "1" } });
    expect(rangeOf(iso, "BB").range).toEqual(estimate("standard", { opener: "middle", position: "BB", situation: "vs-open", tier: "40bb+" }, "call"));
    expect(rangeOf(iso, "BB").line).toBe("called your raise");
  });

  it("rejects Positions that folded before the flop", () => {
    expect(opponentRange(line({ position: "CO" }), { position: "HJ", type: "standard" }, "en").ok).toBe(false);
    expect(opponentRange(line({ position: "CO" }), { position: "CO", type: "standard" }, "en").ok).toBe(false);
  });
});

describe("solverLinkFor", () => {
  const board = cards("Ks7d2h");

  it("carries a heads-up Spot in bb, with the Preflop line when the Solver knows it", () => {
    const postflop = line({ position: "CO" });
    const estimated = rangeOf(postflop, "BB", "loose").range;
    const link = solverLinkFor({ board, hand: hand("AsKd"), line: postflop, opponent: { position: "BB", range: estimated }, pot: 5.5, stack: 47.5 });
    expect(link).toMatchObject({ board, depth: 50, hand: hand("AsKd"), line: { caller: "BB", kind: "open", opener: "CO" }, pot: 5.5, stack: 47.5 });
    const hero = getChart({ position: "CO", situation: "open", tier: "40bb+" }).actions[0].range;
    expect(link.ranges).toEqual([estimated, hero]);
  });

  it("puts the hero first when the hero is out of position", () => {
    const postflop = line({ hand: hand("8c8d"), position: "BB", situation: { kind: "open", opener: "BTN" } });
    const estimated = rangeOf(postflop, "BTN").range;
    const link = solverLinkFor({ board, hand: hand("8c8d"), line: postflop, opponent: { position: "BTN", range: estimated }, pot: 5.5, stack: 47.5 });
    expect(link.line).toEqual({ caller: "BB", kind: "open", opener: "BTN" });
    expect(link.ranges?.[1]).toEqual(estimated);
  });

  it("uses the limp line for SB limp, BB check", () => {
    const postflop = line({ hand: hand("9c8d"), position: "SB" });
    const link = solverLinkFor({ board, hand: hand("9c8d"), line: postflop, opponent: { position: "BB", range: rangeOf(postflop, "BB").range }, pot: 2, stack: 49 });
    expect(link.line).toEqual({ kind: "limp" });
  });

  it("carries the Blind level with the line when the stack is in chips", () => {
    const postflop = line({ position: "CO" });
    const opponent = { position: "BB" as const, range: rangeOf(postflop, "BB").range };
    expect(solverLinkFor({ board, hand: hand("AsKd"), level: 1, line: postflop, opponent, pot: 6, stack: 47.5 }).level).toBe(1);
    expect(solverLinkFor({ board, hand: hand("AsKd"), line: postflop, opponent, pot: 5.5, stack: 47.5 }).level).toBeUndefined();
    const threeBet = line({ hand: hand("AcAd"), position: "BTN", situation: { kind: "open", opener: "CO" } });
    expect(
      solverLinkFor({ board, hand: hand("AcAd"), level: 1, line: threeBet, opponent: { position: "CO", range: rangeOf(threeBet, "CO").range }, pot: 16, stack: 42.5 }).level,
    ).toBeUndefined();
  });

  it("leaves the line out when the Solver has no such line, e.g. a 3-bet pot", () => {
    const postflop = line({ hand: hand("AcAd"), position: "BTN", situation: { kind: "open", opener: "CO" } });
    const link = solverLinkFor({ board, hand: hand("AcAd"), line: postflop, opponent: { position: "CO", range: rangeOf(postflop, "CO").range }, pot: 16, stack: 42.5 });
    expect(link.line).toBeUndefined();
  });

  it("round-trips through the Solver's URL format", () => {
    const postflop = line({ position: "CO" });
    const estimated = rangeOf(postflop, "BB").range;
    const href = solverHref(solverLinkFor({ board, hand: hand("AsKd"), line: postflop, opponent: { position: "BB", range: estimated }, pot: 5.5, stack: 47.5 }));
    const setup = parseSpotParams(new URL(href, "https://x.test").searchParams);
    expect(setup).toMatchObject({ board, depth: 50, hand: hand("AsKd"), line: { caller: "BB", kind: "open", opener: "CO" }, pot: 5.5, stack: 47.5 });
    expect(setup.ranges[0]).toBe(formatRange(estimated).replaceAll(" ", ""));
  });
});
