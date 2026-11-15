import type { CardId } from "./card";

/**
 * Showdown strength of the best five of 5–7 cards: a positive int32 where higher wins and equal ties.
 * Layout: `category << 26 | primary << 13 | kickers`, where primary and kickers are 13-bit rank masks
 * (bit 0 = deuce, bit 12 = ace) and masks of equal size compare like their sorted ranks.
 */
export type Strength = number;

export const CATEGORY_NAMES = ["High card", "Pair", "Two pair", "Three of a kind", "Straight", "Flush", "Full house", "Four of a kind", "Straight flush"] as const;

export type CategoryName = (typeof CATEGORY_NAMES)[number];

const PAIR = 1 << 26;
const TWO_PAIR = 2 << 26;
const TRIPS = 3 << 26;
const STRAIGHT = 4 << 26;
const FLUSH = 5 << 26;
const FULL_HOUSE = 6 << 26;
const QUADS = 7 << 26;
const STRAIGHT_FLUSH = 8 << 26;

/** Index into CATEGORY_NAMES. */
export const strengthCategory = (strength: Strength): number => strength >>> 26;

const POPCOUNT = new Uint8Array(8192);
/** Mask keeping only the top 1, 2, 3 or 5 set bits. */
const TOP1 = new Uint16Array(8192);
const TOP2 = new Uint16Array(8192);
const TOP3 = new Uint16Array(8192);
const TOP5 = new Uint16Array(8192);
/** Top rank of the best straight + 1 (wheel = 4, i.e. five-high), or 0. */
const STRAIGHT_TOP = new Uint8Array(8192);

for (let mask = 1; mask < 8192; mask++) {
  POPCOUNT[mask] = POPCOUNT[mask & (mask - 1)] + 1;
  let kept = 0;
  let count = 0;
  for (let bit = 12; bit >= 0; bit--) {
    if (!(mask & (1 << bit))) continue;
    kept |= 1 << bit;
    count++;
    if (count === 1) TOP1[mask] = kept;
    if (count === 2) TOP2[mask] = kept;
    if (count === 3) TOP3[mask] = kept;
    if (count === 5) TOP5[mask] = kept;
  }
  for (let top = 12; top >= 4; top--) {
    if (((mask >> (top - 4)) & 31) === 31) {
      STRAIGHT_TOP[mask] = top + 1;
      break;
    }
  }
  if (!STRAIGHT_TOP[mask] && (mask & 0b1000000001111) === 0b1000000001111) STRAIGHT_TOP[mask] = 4;
}

function flushStrength(suit: number): Strength {
  const straight = STRAIGHT_TOP[suit];
  return straight ? STRAIGHT_FLUSH | straight : FLUSH | TOP5[suit];
}

/**
 * Strength from per-suit rank masks (bit r set = the card of rank r in that suit is present).
 * Hot path for equity and solver loops: keep board masks and OR in each Combo's two bits.
 * Holds for 5–7 cards in total.
 */
export function evaluateMasks(s0: number, s1: number, s2: number, s3: number): Strength {
  // With at most 7 cards a flush rules out quads and full houses.
  if (POPCOUNT[s0] >= 5) return flushStrength(s0);
  if (POPCOUNT[s1] >= 5) return flushStrength(s1);
  if (POPCOUNT[s2] >= 5) return flushStrength(s2);
  if (POPCOUNT[s3] >= 5) return flushStrength(s3);

  const ones = s0 | s1 | s2 | s3;
  const twos = (s0 & s1) | (s0 & s2) | (s0 & s3) | (s1 & s2) | (s1 & s3) | (s2 & s3);
  const fours = s0 & s1 & s2 & s3;
  if (fours) return QUADS | (fours << 13) | TOP1[ones ^ fours];

  const threes = (s0 & s1 & (s2 | s3)) | (s2 & s3 & (s0 | s1));
  if (threes) {
    const trip = TOP1[threes];
    const pair = twos ^ trip;
    if (pair) return FULL_HOUSE | (trip << 13) | TOP1[pair];
  }
  const straight = STRAIGHT_TOP[ones];
  if (straight) return STRAIGHT | straight;
  if (threes) return TRIPS | (threes << 13) | TOP2[ones ^ threes];
  if (twos) {
    if (POPCOUNT[twos] === 1) return PAIR | (twos << 13) | TOP3[ones ^ twos];
    const pairs = TOP2[twos];
    return TWO_PAIR | (pairs << 13) | TOP1[ones ^ pairs];
  }
  return TOP5[ones];
}

/** Strength of 5–7 distinct cards. */
export function evaluate(cards: ArrayLike<CardId>): Strength {
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const bit = 1 << (card >> 2);
    switch (card & 3) {
      case 0:
        s0 |= bit;
        break;
      case 1:
        s1 |= bit;
        break;
      case 2:
        s2 |= bit;
        break;
      default:
        s3 |= bit;
    }
  }
  return evaluateMasks(s0, s1, s2, s3);
}
