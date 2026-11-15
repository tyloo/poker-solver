import { CARD_COUNT, type CardId } from "@/lib/poker/card";
import { COMBO_COUNT, COMBO_HI, COMBO_LO } from "@/lib/poker/combo";
import { evaluateMasks } from "@/lib/poker/evaluator";
import type { Range } from "@/lib/poker/range";
import { liveCombos } from "./spot";

/** One player's Combos that are live on the Spot board, indexed 0..n−1 in the solver's vectors. */
export type HandSet = {
  combos: Uint16Array;
  /** Starting reach, from the Range weights. */
  weights: Float64Array;
  card1: Uint8Array;
  card2: Uint8Array;
  /** Hand indexes holding each CardId. */
  withCard: Uint16Array[];
};

export function createHandSet(range: Range, board: readonly CardId[]): HandSet {
  const { combos, weights } = liveCombos(range, board);
  const card1 = Uint8Array.from(combos, (combo) => COMBO_HI[combo]);
  const card2 = Uint8Array.from(combos, (combo) => COMBO_LO[combo]);
  const lists: number[][] = Array.from({ length: CARD_COUNT }, () => []);
  for (let hand = 0; hand < combos.length; hand++) {
    lists[card1[hand]].push(hand);
    lists[card2[hand]].push(hand);
  }
  return { card1, card2, combos, weights, withCard: lists.map((list) => Uint16Array.from(list)) };
}

/** For each own hand, the index of the identical Combo in the opponent's set, or −1. */
export function sameComboIndex(own: HandSet, opp: HandSet): Int32Array {
  const byCombo = new Int32Array(COMBO_COUNT).fill(-1);
  opp.combos.forEach((combo, index) => {
    byCombo[combo] = index;
  });
  return Int32Array.from(own.combos, (combo) => byCombo[combo]);
}

/** Hands that miss a five-card board, sorted by ascending showdown strength, with their cards in the same order. */
export type Ranking = { order: Uint16Array; strength: Int32Array; card1: Uint8Array; card2: Uint8Array };

export function rankHands(hands: HandSet, board: readonly CardId[]): Ranking {
  const masks = [0, 0, 0, 0];
  for (const card of board) masks[card & 3] |= 1 << (card >> 2);
  const ranked: { hand: number; strength: number }[] = [];
  for (let hand = 0; hand < hands.combos.length; hand++) {
    const a = hands.card1[hand];
    const b = hands.card2[hand];
    if (board.includes(a) || board.includes(b)) continue;
    const suits = masks.slice();
    suits[a & 3] |= 1 << (a >> 2);
    suits[b & 3] |= 1 << (b >> 2);
    ranked.push({ hand, strength: evaluateMasks(suits[0], suits[1], suits[2], suits[3]) });
  }
  ranked.sort((x, y) => x.strength - y.strength);
  const order = Uint16Array.from(ranked, (entry) => entry.hand);
  return {
    card1: Uint8Array.from(order, (hand) => hands.card1[hand]),
    card2: Uint8Array.from(order, (hand) => hands.card2[hand]),
    order,
    strength: Int32Array.from(ranked, (entry) => entry.strength),
  };
}

const minus = new Float64Array(CARD_COUNT);

/** Opponent reach compatible with each own hand (no shared card), times `payoff`. */
export function foldValues(out: Float64Array, own: HandSet, opp: HandSet, reach: Float64Array, same: Int32Array, payoff: number): void {
  minus.fill(0);
  let total = 0;
  const { card1, card2 } = opp;
  for (let o = 0; o < reach.length; o++) {
    const r = reach[o];
    if (r === 0) continue;
    total += r;
    minus[card1[o]] += r;
    minus[card2[o]] += r;
  }
  for (let h = 0; h < out.length; h++) {
    const s = same[h];
    out[h] = payoff * (total - minus[own.card1[h]] - minus[own.card2[h]] + (s >= 0 ? reach[s] : 0));
  }
}

/**
 * Showdown values on one runout: each own hand gets `win`, `lose` or `tie` per unit of compatible
 * opponent reach. Hands blocked by the runout get 0. O(n + m) with prefix sums and card removal.
 */
export function showdownValues(out: Float64Array, ownRanking: Ranking, oppRanking: Ranking, reach: Float64Array, same: Int32Array, win: number, lose: number, tie: number): void {
  out.fill(0);
  const { order, strength, card1, card2 } = ownRanking;
  const oppOrder = oppRanking.order;
  const oppStrength = oppRanking.strength;
  const oppCard1 = oppRanking.card1;
  const oppCard2 = oppRanking.card2;
  const count = order.length;
  const oppCount = oppOrder.length;
  const winGain = win - tie;
  const loseGain = lose - tie;

  minus.fill(0);
  let total = 0;
  for (let k = 0, j = 0; k < count; k++) {
    const s = strength[k];
    while (j < oppCount && oppStrength[j] < s) {
      const r = reach[oppOrder[j]];
      if (r !== 0) {
        total += r;
        minus[oppCard1[j]] += r;
        minus[oppCard2[j]] += r;
      }
      j++;
    }
    out[order[k]] = winGain * (total - minus[card1[k]] - minus[card2[k]]);
  }

  minus.fill(0);
  total = 0;
  for (let k = count - 1, j = oppCount - 1; k >= 0; k--) {
    const s = strength[k];
    while (j >= 0 && oppStrength[j] > s) {
      const r = reach[oppOrder[j]];
      if (r !== 0) {
        total += r;
        minus[oppCard1[j]] += r;
        minus[oppCard2[j]] += r;
      }
      j--;
    }
    out[order[k]] += loseGain * (total - minus[card1[k]] - minus[card2[k]]);
  }

  if (tie === 0) return;
  minus.fill(0);
  total = 0;
  for (let j = 0; j < oppCount; j++) {
    const r = reach[oppOrder[j]];
    total += r;
    minus[oppCard1[j]] += r;
    minus[oppCard2[j]] += r;
  }
  for (let k = 0; k < count; k++) {
    const h = order[k];
    const s = same[h];
    out[h] += tie * (total - minus[card1[k]] - minus[card2[k]] + (s >= 0 ? reach[s] : 0));
  }
}
