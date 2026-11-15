export const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;
export const SUITS = ["s", "h", "d", "c"] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];
export type Card = { rank: Rank; suit: Suit };

const isRank = (value: string): value is Rank => (RANKS as readonly string[]).includes(value);
const isSuit = (value: string): value is Suit => (SUITS as readonly string[]).includes(value);

/** Parses compact notation such as "AsKd". Returns null on malformed input or duplicates. */
export function parseCards(text: string): Card[] | null {
  if (text.length % 2 !== 0) return null;
  const cards: Card[] = [];
  for (let i = 0; i < text.length; i += 2) {
    const rank = text[i].toUpperCase();
    const suit = text[i + 1].toLowerCase();
    if (!isRank(rank) || !isSuit(suit)) return null;
    if (cards.some((card) => card.rank === rank && card.suit === suit)) return null;
    cards.push({ rank, suit });
  }
  return cards;
}

export function formatCards(cards: readonly Card[]): string {
  return cards.map((card) => card.rank + card.suit).join("");
}

/**
 * Numeric card for hot loops: `rank * 4 + suit`, where rank 0 is a deuce and 12 an ace,
 * and suit indexes SUITS. Deuce of spades is 0, ace of clubs is 51.
 */
export type CardId = number;

export const CARD_COUNT = 52;

export const cardRank = (id: CardId): number => id >> 2;
export const cardSuit = (id: CardId): number => id & 3;

export function cardId(card: Card): CardId {
  return (12 - RANKS.indexOf(card.rank)) * 4 + SUITS.indexOf(card.suit);
}

export function cardFromId(id: CardId): Card {
  return { rank: RANKS[12 - cardRank(id)], suit: SUITS[cardSuit(id)] };
}
