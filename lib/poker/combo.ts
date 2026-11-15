import { CARD_COUNT, type CardId, cardFromId, cardId, cardRank, cardSuit, parseCards, RANKS } from "./card";

/** A Combo as an index 0..1325: `hi * (hi - 1) / 2 + lo` over its two CardIds, `hi > lo`. */
export type ComboId = number;

/** A Hand class as its cell in the 13×13 grid: `row * 13 + col`, rows and columns in RANKS order (A first). */
export type HandClassId = number;

export type HandClassKind = "pair" | "suited" | "offsuit";

export const COMBO_COUNT = 1326;
export const HAND_CLASS_COUNT = 169;

/** Higher and lower CardId of each Combo. */
export const COMBO_HI = new Uint8Array(COMBO_COUNT);
export const COMBO_LO = new Uint8Array(COMBO_COUNT);
/** Hand class of each Combo. */
export const COMBO_HAND_CLASS = new Uint8Array(COMBO_COUNT);

export function comboId(a: CardId, b: CardId): ComboId {
  return a > b ? (a * (a - 1)) / 2 + b : (b * (b - 1)) / 2 + a;
}

export function comboCards(combo: ComboId): [CardId, CardId] {
  return [COMBO_HI[combo], COMBO_LO[combo]];
}

/** "AsKd": higher rank first; a pair lists its suits in s-h-d-c order. */
export function formatCombo(combo: ComboId): string {
  const hi = cardFromId(COMBO_HI[combo]);
  const lo = cardFromId(COMBO_LO[combo]);
  // Equal ranks: the higher id has the later suit, so list the lower id first.
  const [first, second] = hi.rank === lo.rank ? [lo, hi] : [hi, lo];
  return first.rank + first.suit + second.rank + second.suit;
}

/** Parses two cards such as "AsKd" in either order. Returns null on malformed input. */
export function parseCombo(text: string): ComboId | null {
  const cards = text.length === 4 ? parseCards(text) : null;
  return cards ? comboId(cardId(cards[0]), cardId(cards[1])) : null;
}

const rowOf = (rank: number) => 12 - rank;

function handClassOfCards(hi: CardId, lo: CardId): HandClassId {
  const high = rowOf(cardRank(hi));
  const low = rowOf(cardRank(lo));
  if (cardSuit(hi) === cardSuit(lo)) return high * 13 + low;
  return Math.max(high, low) * 13 + Math.min(high, low);
}

export function handClassKind(cls: HandClassId): HandClassKind {
  const row = Math.floor(cls / 13);
  const col = cls % 13;
  return row === col ? "pair" : row < col ? "suited" : "offsuit";
}

/** Names in grid order: "AA", "AKs", …, "AKo", "KK", …, "22". */
export const HAND_CLASS_NAMES: readonly string[] = Array.from({ length: HAND_CLASS_COUNT }, (_, cls) => {
  const row = Math.floor(cls / 13);
  const col = cls % 13;
  if (row === col) return RANKS[row] + RANKS[row];
  return row < col ? `${RANKS[row]}${RANKS[col]}s` : `${RANKS[col]}${RANKS[row]}o`;
});

const combosByClass: ComboId[][] = Array.from({ length: HAND_CLASS_COUNT }, () => []);

for (let hi = 1; hi < CARD_COUNT; hi++) {
  for (let lo = 0; lo < hi; lo++) {
    const combo = comboId(hi, lo);
    const cls = handClassOfCards(hi, lo);
    COMBO_HI[combo] = hi;
    COMBO_LO[combo] = lo;
    COMBO_HAND_CLASS[combo] = cls;
    combosByClass[cls].push(combo);
  }
}

export const handClassOfCombo = (combo: ComboId): HandClassId => COMBO_HAND_CLASS[combo];

/** The 6, 4 or 12 Combos of a Hand class, in ascending ComboId order. */
export const handClassCombos = (cls: HandClassId): readonly ComboId[] => combosByClass[cls];

/** Parses "AKs", "KAs", "AKo" or "QQ" (ranks in either order, any case). Returns null otherwise. */
export function parseHandClass(text: string): HandClassId | null {
  if (text.length !== 2 && text.length !== 3) return null;
  const a = RANKS.indexOf(text[0].toUpperCase() as (typeof RANKS)[number]);
  const b = RANKS.indexOf(text[1].toUpperCase() as (typeof RANKS)[number]);
  if (a < 0 || b < 0) return null;
  const suffix = text.slice(2).toLowerCase();
  if (a === b) return suffix === "" ? a * 13 + a : null;
  const high = Math.min(a, b);
  const low = Math.max(a, b);
  if (suffix === "s") return high * 13 + low;
  if (suffix === "o") return low * 13 + high;
  return null;
}
