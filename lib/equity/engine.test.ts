import { describe, expect, it } from "vitest";
import { type CardId, cardId, parseCards } from "@/lib/poker/card";
import { COMBO_COUNT, COMBO_HI, COMBO_LO } from "@/lib/poker/combo";
import { evaluate } from "@/lib/poker/evaluator";
import { parseRange, type Range } from "@/lib/poker/range";
import { computeEquity, createEquityJob, type EquityInput, type EquityOptions, type EquityPlayer, type EquityResult, seededRandom } from "./engine";

const cards = (text: string): CardId[] => (parseCards(text) ?? []).map(cardId);
const hand = (text: string): EquityPlayer => ({ cards: cards(text), kind: "hand" });
const random: EquityPlayer = { kind: "random" };

function rangeOf(text: string): Range {
  const result = parseRange(text);
  if (!result.ok) throw new Error(result.error);
  return result.range;
}
const range = (text: string): EquityPlayer => ({ kind: "range", range: rangeOf(text) });

function input(players: EquityPlayer[], board = "", dead = ""): EquityInput {
  return { board: cards(board), dead: cards(dead), players };
}

function run(value: EquityInput, options: EquityOptions = {}): EquityResult {
  const outcome = computeEquity(value, { random: seededRandom(1), ...options });
  if (!outcome.ok) throw new Error(outcome.error);
  return outcome.result;
}

function errorOf(value: EquityInput): string {
  const outcome = computeEquity(value, { random: seededRandom(1) });
  if (outcome.ok) throw new Error("expected an error");
  return outcome.error;
}

const percent = (fraction: number) => fraction * 100;

/** Independent slow reference: enumerates every weighted deal and board with the plain evaluator. */
function referenceEquity(players: EquityPlayer[], boardText: string, deadText = "") {
  const board = cards(boardText);
  const known = new Set([...board, ...cards(deadText)]);
  const options = players.map((player) => {
    const list: { cards: CardId[]; weight: number }[] = [];
    for (let combo = 0; combo < COMBO_COUNT; combo++) {
      const pair = [COMBO_HI[combo], COMBO_LO[combo]];
      const weight = player.kind === "random" ? 1 : player.kind === "range" ? player.range[combo] : pair.every((card) => player.cards.includes(card)) ? 1 : 0;
      if (weight > 0) list.push({ cards: pair, weight });
    }
    return list;
  });
  const win = players.map(() => 0);
  const tie = players.map(() => 0);
  const share = players.map(() => 0);
  let total = 0;
  const deal = (index: number, used: Set<CardId>, holes: CardId[][], weight: number) => {
    if (index === players.length) {
      const deck = Array.from({ length: 52 }, (_, card) => card).filter((card) => !used.has(card));
      const missing = 5 - board.length;
      const boards: CardId[][] = [];
      const pick = (from: number, chosen: CardId[]) => {
        if (chosen.length === missing) boards.push(chosen);
        else for (let i = from; i < deck.length; i++) pick(i + 1, [...chosen, deck[i]]);
      };
      pick(0, []);
      for (const rest of boards) {
        const strengths = holes.map((hole) => evaluate([...hole, ...board, ...rest]));
        const best = Math.max(...strengths);
        const winners = strengths.flatMap((strength, player) => (strength === best ? [player] : []));
        for (const player of winners) {
          if (winners.length === 1) win[player] += weight;
          else tie[player] += weight;
          share[player] += weight / winners.length;
        }
        total += weight;
      }
      return;
    }
    for (const option of options[index]) {
      if (option.cards.some((card) => used.has(card))) continue;
      deal(index + 1, new Set([...used, ...option.cards]), [...holes, option.cards], weight * option.weight);
    }
  };
  deal(0, known, [], 1);
  return players.map((_, player) => ({ equity: share[player] / total, tie: tie[player] / total, win: win[player] / total }));
}

function expectClose(actual: EquityResult, expected: { win: number; tie: number; equity: number }[], digits: number) {
  expect(actual.players).toHaveLength(expected.length);
  actual.players.forEach((player, index) => {
    expect(player.win).toBeCloseTo(expected[index].win, digits);
    expect(player.tie).toBeCloseTo(expected[index].tie, digits);
    expect(player.equity).toBeCloseTo(expected[index].equity, digits);
  });
}

// Reference equities: exact enumeration recomputed for this project (research note ref-equity.md),
// cross-checked with CardFight (https://www.cardfight.com/AA_KK.html), pokerpro.tools per-suit tables
// (https://pokerpro.tools/matchups/aa-vs-kk), TrainingSharks three-way pairs
// (https://trainingsharks.com/matchups/aa-vs-kk-vs-qq) and 169hands.com hand-vs-random figures.

describe("exact enumeration: reference preflop matchups", () => {
  it("AA vs KK with no shared suits: 81.26% / 18.74%", () => {
    const result = run(input([hand("AhAs"), hand("KdKc")]));
    expect(result.method).toBe("exact");
    expect(result.samples).toBe(1712304);
    expect(percent(result.players[0].equity)).toBeCloseTo(81.26, 2);
    expect(percent(result.players[0].win)).toBeCloseTo(81.06, 2);
    expect(percent(result.players[0].tie)).toBeCloseTo(0.38, 2);
    expect(percent(result.players[1].equity)).toBeCloseTo(18.74, 2);
  });

  it("AA vs KK with both suits shared: 82.64% / 17.36%", () => {
    const result = run(input([hand("AsAh"), hand("KsKh")]));
    expect(percent(result.players[0].equity)).toBeCloseTo(82.64, 2);
    expect(percent(result.players[0].win)).toBeCloseTo(82.36, 2);
    expect(percent(result.players[0].tie)).toBeCloseTo(0.54, 2);
  });

  it("AA vs KK vs QQ, all clubs and diamonds: 67.67% / 17.23% / 15.10%", () => {
    const result = run(input([hand("AcAd"), hand("KcKd"), hand("QcQd")]));
    expect(result.method).toBe("exact");
    expect(result.samples).toBe(1370754);
    expect(result.players.map((player) => percent(player.equity))).toEqual([expect.closeTo(67.67, 2), expect.closeTo(17.23, 2), expect.closeTo(15.1, 2)]);
    expect(percent(result.players[0].win)).toBeCloseTo(67.47, 2);
    expect(percent(result.players[0].tie)).toBeCloseTo(0.6, 2);
  });

  it("AKs vs QQ suited in hearts vs QsQd: 46.214% / 53.786%", () => {
    const result = run(input([hand("AhKh"), hand("QsQd")]));
    expect(percent(result.players[0].equity)).toBeCloseTo(46.214, 2);
    expect(percent(result.players[0].win)).toBeCloseTo(46.018, 2);
    expect(percent(result.players[0].tie)).toBeCloseTo(0.393, 2);
  });

  it("AhKh vs JdJc vs 8s7s: 38.752% / 39.856% / 21.392%", () => {
    const result = run(input([hand("AhKh"), hand("JdJc"), hand("8s7s")]));
    expect(result.players.map((player) => percent(player.equity))).toEqual([expect.closeTo(38.752, 2), expect.closeTo(39.856, 2), expect.closeTo(21.392, 2)]);
  });

  it("flop and turn runouts", () => {
    expect(percent(run(input([hand("AhAs"), hand("KdKc")], "Kh7d2c")).players[0].equity)).toBeCloseTo(8.586, 2);
    expect(percent(run(input([hand("8h7h"), hand("AsKd")], "6h5d2c")).players[0].equity)).toBeCloseTo(52.222, 2);
    const turn = run(input([hand("AhKh"), hand("QsQd")], "Jh9h2c5s"));
    expect(turn.samples).toBe(44);
    expect(turn.players[0].equity).toBe(15 / 44);
    expect(run(input([hand("AsKs"), hand("QhQd")], "Qs7s2d3h")).players[0].equity).toBe(7 / 44);
  });

  it("splits every pot when the board plays", () => {
    const result = run(input([hand("2c3d"), hand("4c5d"), random], "AsKsQsJsTs"));
    expect(result.method).toBe("exact");
    for (const player of result.players) {
      expect(player).toEqual({ equity: expect.closeTo(1 / 3, 12), tie: 1, win: 0 });
    }
  });
});

describe("exact enumeration matches an independent reference", () => {
  it("hand vs hand vs hand on the flop", () => {
    const players = [hand("AhKh"), hand("QsQd"), hand("Jc9c")];
    expectClose(run(input(players, "Qh7h2c")), referenceEquity(players, "Qh7h2c"), 12);
  });

  it("weighted ranges and dead cards on the turn", () => {
    const players = [hand("QsQd"), range("AK, 77:0.5, JTs:0.25"), range("88+:0.7, A5s")];
    const result = run(input(players, "Ah7d2c9s", "Kc5h"));
    expect(result.method).toBe("exact");
    expectClose(result, referenceEquity(players, "Ah7d2c9s", "Kc5h"), 12);
  });

  it("a random hand on the river", () => {
    const players = [hand("Td9d"), random, range("QQ+, AK")];
    const result = run(input(players, "8d7d2sKh3c"));
    expect(result.method).toBe("exact");
    expectClose(result, referenceEquity(players, "8d7d2sKh3c"), 12);
  });

  it("gives the same answer however it is sliced", () => {
    const value = input([hand("AhKh"), range("TT+, AQs+")], "Qh7h2c");
    const outcome = createEquityJob(value);
    if (!outcome.ok) throw new Error(outcome.error);
    while (!outcome.job.step(97));
    expect(outcome.job.result()).toEqual(run(value));
  });
});

describe("Monte Carlo", () => {
  // Percentage points: 4 standard errors at the default target precision.
  const tolerance = 0.2;

  it("is used when enumeration is too large, and reports its sample count", () => {
    const result = run(input([range("AA"), range("KK")]));
    expect(result.method).toBe("monte-carlo");
    expect(result.samples).toBeGreaterThanOrEqual(10_000);
  });

  const expectEquities = (result: EquityResult, expected: number[]) => {
    result.players.forEach((player, index) => {
      expect(Math.abs(percent(player.equity) - expected[index])).toBeLessThan(tolerance);
    });
  };

  it("AA vs KK: 81.946% / 18.054%, AA wins 81.715% and ties 0.463%", () => {
    const result = run(input([range("AA"), range("KK")]));
    expectEquities(result, [81.946, 18.054]);
    expect(Math.abs(percent(result.players[0].win) - 81.715)).toBeLessThan(tolerance);
    expect(Math.abs(percent(result.players[0].tie) - 0.463)).toBeLessThan(tolerance);
  });

  it("AKs vs QQ: 46.049% / 53.951%", () => {
    expectEquities(run(input([range("AKs"), range("QQ")])), [46.049, 53.951]);
  });

  it("AKo vs 22: 47.351% / 52.649%", () => {
    expectEquities(run(input([range("AKo"), range("22")])), [47.351, 52.649]);
  });

  it("AA vs KK vs QQ: 66.979% / 17.746% / 15.275%", () => {
    expectEquities(run(input([range("AA"), range("KK"), range("QQ")])), [66.979, 17.746, 15.275]);
  });

  it("AKs vs QQ vs JTs: 40.493% / 42.380% / 17.127%", () => {
    expectEquities(run(input([range("AKs"), range("QQ"), range("JTs")])), [40.493, 42.38, 17.127]);
  });

  it("hands against a random hand: AA 85.204%, 72o 34.584%", () => {
    const result = run(input([hand("AsAh"), random]));
    expect(result.method).toBe("monte-carlo");
    expectEquities(result, [85.204, 14.796]);
    expectEquities(run(input([hand("7s2d"), random])), [34.584, 65.416]);
  });

  it("agrees with exact enumeration for weighted ranges, random hands and dead cards", () => {
    const players = [range("TT+:0.6, AQs+, KQs:0.3"), random, hand("9h8h"), range("22-55, A5s-A2s")];
    const value = input(players, "Th7h2c6d3s", "Ks");
    const exact = run(value, { exactLimit: Number.POSITIVE_INFINITY });
    const sampled = run(value, { exactLimit: 0, random: seededRandom(42) });
    expect(exact.method).toBe("exact");
    expect(sampled.method).toBe("monte-carlo");
    sampled.players.forEach((player, index) => {
      expect(Math.abs(percent(player.equity - exact.players[index].equity))).toBeLessThan(tolerance);
      expect(Math.abs(percent(player.tie - exact.players[index].tie))).toBeLessThan(tolerance);
    });
  });

  it("stops at the sample cap", () => {
    const result = run(input([random, random, random]), { maxSamples: 5000, targetError: 0 });
    expect(result.samples).toBe(5000);
    expect(result.players.reduce((sum, player) => sum + player.equity, 0)).toBeCloseTo(1, 12);
  });
});

describe("input errors", () => {
  it("needs 2 to 8 players", () => {
    expect(errorOf(input([hand("AsAh")]))).toBe("Add at least 2 players.");
    expect(errorOf(input(Array.from({ length: 9 }, () => random)))).toBe("At most 8 players.");
  });

  it("rejects a hand without two cards and a board above five", () => {
    expect(errorOf(input([hand("As"), random]))).toBe("Player 1 needs two cards.");
    expect(errorOf(input([random, random], "AsKsQsJsTs9s"))).toBe("The board has at most 5 cards.");
  });

  it("rejects a card used twice", () => {
    expect(errorOf(input([hand("AsAh"), hand("AsKd")]))).toBe("A♠ is used twice.");
    expect(errorOf(input([hand("AsAh"), random], "Ah7d2c"))).toBe("A♥ is used twice.");
  });

  it("rejects a range with no possible hand", () => {
    expect(errorOf(input([hand("AsAh"), range("")]))).toBe("Player 2's range is empty.");
    expect(errorOf(input([hand("AsAh"), range("AsAd, AhAc")]))).toBe("Player 2's range has no hand left after the cards in use.");
  });

  it("rejects ranges that cannot all be dealt at once", () => {
    expect(errorOf(input([range("AA"), range("AA"), range("AA")]))).toBe("These ranges cannot be dealt together: they need the same cards.");
  });
});
