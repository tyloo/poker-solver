import { describe, expect, it } from "vitest";
import { COMBO_COUNT, COMBO_HI, COMBO_LO } from "@/lib/poker/combo";
import { evaluate } from "@/lib/poker/evaluator";
import { createRange } from "@/lib/poker/range";
import { createHandSet, foldValues, rankHands, sameComboIndex, showdownValues } from "./evaluation";
import { board } from "./test-helpers";

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function randomBoard(next: () => number): number[] {
  const cards = new Set<number>();
  while (cards.size < 5) cards.add(Math.floor(next() * 52));
  return [...cards];
}

function randomRange(next: () => number, density: number) {
  const range = createRange();
  for (let combo = 0; combo < COMBO_COUNT; combo++) if (next() < density) range[combo] = next() < 0.5 ? 1 : next();
  return range;
}

const shares = (a: number, b: number) => COMBO_HI[a] === COMBO_HI[b] || COMBO_HI[a] === COMBO_LO[b] || COMBO_LO[a] === COMBO_HI[b] || COMBO_LO[a] === COMBO_LO[b];

describe("hand sets", () => {
  it("keep only the weighted Combos that miss the board, with an index per card", () => {
    const range = createRange();
    range.fill(1);
    const hands = createHandSet(range, board("AsKsQs"));
    expect(hands.combos).toHaveLength((49 * 48) / 2);
    const ah = board("Ah")[0];
    expect(hands.withCard[ah]).toHaveLength(48);
    for (const index of hands.withCard[ah]) expect(hands.card1[index] === ah || hands.card2[index] === ah).toBe(true);
    expect(hands.withCard[board("As")[0]]).toHaveLength(0);
  });

  it("link identical Combos across the two players", () => {
    const own = createHandSet(Object.assign(createRange(), { 5: 1, 9: 1 }), []);
    const opp = createHandSet(Object.assign(createRange(), { 9: 0.5, 12: 1 }), []);
    expect([...sameComboIndex(own, opp)]).toEqual([-1, 0]);
  });
});

describe("vectorized terminals", () => {
  for (const seed of [1, 2, 3, 4]) {
    it(`match a brute-force double loop (seed ${seed})`, () => {
      const next = random(seed);
      const cards = randomBoard(next);
      const own = createHandSet(randomRange(next, seed === 1 ? 1 : 0.4), cards);
      const opp = createHandSet(randomRange(next, seed === 1 ? 1 : 0.4), cards);
      const reach = Float64Array.from(opp.weights, (weight) => weight * next());
      const same = sameComboIndex(own, opp);
      const strength = (combo: number) => evaluate([...cards, COMBO_HI[combo], COMBO_LO[combo]]);

      const fold = new Float64Array(own.combos.length);
      foldValues(fold, own, opp, reach, same, -3);
      const showdown = new Float64Array(own.combos.length);
      showdownValues(showdown, rankHands(own, cards), rankHands(opp, cards), reach, same, 7, -2, 2.5);

      for (let h = 0; h < own.combos.length; h++) {
        let compatible = 0;
        let value = 0;
        for (let o = 0; o < opp.combos.length; o++) {
          if (shares(own.combos[h], opp.combos[o])) continue;
          compatible += reach[o];
          const diff = strength(own.combos[h]) - strength(opp.combos[o]);
          value += reach[o] * (diff > 0 ? 7 : diff < 0 ? -2 : 2.5);
        }
        expect(fold[h]).toBeCloseTo(-3 * compatible, 9);
        expect(showdown[h]).toBeCloseTo(value, 9);
      }
    });
  }

  it("give zero to hands blocked by the runout", () => {
    const range = createRange();
    range.fill(1);
    const turn = board("2c3d7h8s");
    const own = createHandSet(range, turn);
    const opp = createHandSet(range, turn);
    const river = [...turn, board("Jc")[0]];
    const reach = Float64Array.from(opp.weights);
    for (const index of opp.withCard[river[4]]) reach[index] = 0;
    const out = new Float64Array(own.combos.length).fill(99);
    showdownValues(out, rankHands(own, river), rankHands(opp, river), reach, sameComboIndex(own, opp), 1, 0, 0.5);
    for (const index of own.withCard[river[4]]) expect(out[index]).toBe(0);
  });
});
