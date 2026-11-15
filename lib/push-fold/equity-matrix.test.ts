import { describe, expect, it } from "vitest";
import { type CardId, cardId, parseCards } from "@/lib/poker/card";
import { COMBO_COUNT, COMBO_HAND_CLASS, COMBO_HI, COMBO_LO, HAND_CLASS_COUNT, handClassCombos, parseHandClass } from "@/lib/poker/combo";
import { evaluate } from "@/lib/poker/evaluator";
import { canonicalBoards, createShowdownTally, equityMatrix, matchupWeights, tallyBoard } from "./equity-matrix";

const cls = (name: string) => parseHandClass(name) ?? -1;
const cards = (text: string): CardId[] => (parseCards(text) ?? []).map(cardId);

describe("canonicalBoards", () => {
  const { cards: boardCards, orbits, count } = canonicalBoards();

  it("lists the 134,459 suit-isomorphic 5-card boards", () => {
    expect(count).toBe(134_459);
    expect(boardCards.length).toBe(count * 5);
  });

  it("weights each board by its orbit so the weights cover all C(52,5) boards", () => {
    let total = 0;
    for (let i = 0; i < count; i++) total += orbits[i];
    expect(total).toBe(2_598_960);
    expect(new Set(orbits)).toEqual(new Set([4, 12, 24]));
  });
});

describe("matchupWeights", () => {
  const weights = matchupWeights();
  const w = (a: string, b: string) => weights[cls(a) * HAND_CLASS_COUNT + cls(b)];

  it("counts the non-conflicting ordered Combo pairs of two Hand classes", () => {
    expect(w("AA", "KK")).toBe(36);
    expect(w("AKs", "AA")).toBe(12);
    expect(w("AKs", "AKo")).toBe(24);
    expect(w("AKo", "AQo")).toBe(108);
    expect(w("AA", "AA")).toBe(6);
  });

  it("gives every Combo 1225 opponents", () => {
    for (let i = 0; i < HAND_CLASS_COUNT; i++) {
      let row = 0;
      for (let j = 0; j < HAND_CLASS_COUNT; j++) row += weights[i * HAND_CLASS_COUNT + j];
      expect(row).toBe(handClassCombos(i).length * 1225);
    }
  });
});

/** Slow reference: every non-conflicting Combo pair on the board, scored 2 for a win and 1 for a tie. */
function bruteForceTally(board: readonly CardId[]): Float64Array {
  const tally = new Float64Array(HAND_CLASS_COUNT * HAND_CLASS_COUNT);
  const used = (card: number) => board.includes(card);
  const strength = new Int32Array(COMBO_COUNT);
  for (let combo = 0; combo < COMBO_COUNT; combo++) if (!used(COMBO_HI[combo]) && !used(COMBO_LO[combo])) strength[combo] = evaluate([...board, COMBO_HI[combo], COMBO_LO[combo]]);
  for (let a = 0; a < COMBO_COUNT; a++) {
    if (used(COMBO_HI[a]) || used(COMBO_LO[a])) continue;
    for (let b = 0; b < COMBO_COUNT; b++) {
      if (used(COMBO_HI[b]) || used(COMBO_LO[b]) || COMBO_HI[a] === COMBO_HI[b] || COMBO_HI[a] === COMBO_LO[b] || COMBO_LO[a] === COMBO_HI[b] || COMBO_LO[a] === COMBO_LO[b])
        continue;
      const score = strength[a] > strength[b] ? 2 : strength[a] === strength[b] ? 1 : 0;
      tally[COMBO_HAND_CLASS[a] * HAND_CLASS_COUNT + COMBO_HAND_CLASS[b]] += score;
    }
  }
  return tally;
}

describe("tallyBoard", () => {
  it("matches a brute-force count of every Combo pair on sample boards", () => {
    for (const board of ["AsKsQsJsTs", "2c2d2h7s9c", "Ah7d2c5s9h", "KdKh4c4s8d"]) {
      const tally = createShowdownTally();
      tallyBoard(tally, Uint8Array.from(cards(board)), 0, 1);
      expect(Array.from(tally.scores)).toEqual(Array.from(bruteForceTally(cards(board))));
    }
  });

  it("scales by the board weight", () => {
    const once = createShowdownTally();
    const thrice = createShowdownTally();
    const board = Uint8Array.from(cards("Ah7d2c5s9h"));
    tallyBoard(once, board, 0, 1);
    tallyBoard(thrice, board, 0, 3);
    expect(Array.from(thrice.scores)).toEqual(Array.from(once.scores, (score) => score * 3));
  });
});

describe("equityMatrix", () => {
  it("turns tallies into class-average equities that sum to 1 across a matchup", () => {
    const tally = createShowdownTally();
    const { cards: boardCards, orbits, count } = canonicalBoards();
    // A spread of boards is enough to check the bookkeeping; the generator uses all of them.
    for (let i = 0; i < count; i += 997) tallyBoard(tally, boardCards, i * 5, orbits[i]);
    const matrix = equityMatrix(tally);
    const eq = (a: string, b: string) => matrix.equity[cls(a) * HAND_CLASS_COUNT + cls(b)];
    expect(eq("AA", "KK") + eq("KK", "AA")).toBeCloseTo(1, 12);
    expect(eq("AKs", "QQ") + eq("QQ", "AKs")).toBeCloseTo(1, 12);
    expect(eq("AA", "AA")).toBeCloseTo(0.5, 12);
    expect(eq("AA", "KK")).toBeGreaterThan(0.75);
    expect(matrix.weight).toEqual(matchupWeights());
  });
});
