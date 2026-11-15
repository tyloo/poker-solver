import type { EquityError } from "@/lib/equity/engine";
import type { MissingInput } from "@/lib/equity/setup";
import { type CardId, cardFromId } from "@/lib/poker/card";
import type { Locale } from "./locale";
import { messages } from "./messages";
import { rangeErrorText } from "./range";

const SUIT_SYMBOLS = { c: "♣", d: "♦", h: "♥", s: "♠" } as const;

/** "A♠", "10♥". */
function cardLabel(card: CardId): string {
  const { rank, suit } = cardFromId(card);
  return (rank === "T" ? "10" : rank) + SUIT_SYMBOLS[suit];
}

/** Why the equity engine refused the input or gave up. */
export function equityErrorText(error: EquityError, locale: Locale): string {
  const t = messages(locale).equity;
  switch (error.code) {
    case "too-few":
      return t.tooFew;
    case "too-many":
      return t.tooMany(error.max);
    case "board-size":
      return t.boardSize;
    case "needs-two":
      return t.needsTwo(error.player);
    case "unknown-card":
      return t.unknownCard;
    case "used-twice":
      return t.usedTwice(cardLabel(error.card));
    case "range-empty":
      return t.rangeEmpty(error.player);
    case "range-blocked":
      return t.rangeBlocked(error.player);
    case "no-board":
      return t.noBoard;
    case "cannot-deal":
      return t.cannotDeal;
    case "too-much-overlap":
      return t.overlapTooMuch;
  }
}

/** What the Equity setup still needs. */
export function equityMissingText(missing: MissingInput, locale: Locale): string {
  const t = messages(locale).equity;
  if (missing.code === "range") return t.rangeError(missing.player, rangeErrorText(missing.error, locale));
  return missing.code === "pick-two" ? t.pickTwo(missing.player) : t.paintFor(missing.player);
}
