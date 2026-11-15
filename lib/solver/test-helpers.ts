import { type CardId, cardId, parseCards } from "@/lib/poker/card";
import { parseRange, type Range } from "@/lib/poker/range";
import type { Spot } from "./spot";

export function board(text: string): CardId[] {
  const cards = parseCards(text.replaceAll(" ", ""));
  if (!cards) throw new Error(`Bad cards "${text}"`);
  return cards.map(cardId);
}

export function range(text: string): Range {
  const result = parseRange(text);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.range;
}

export function spot(fields: Partial<Omit<Spot, "board" | "ranges">> & { board: string; oop: string; ip: string }): Spot {
  const { board: boardText, oop, ip, ...rest } = fields;
  return { betSizes: [0.33, 0.75], effectiveStack: 1000, pot: 100, raiseSizes: [3], ...rest, board: board(boardText), ranges: [range(oop), range(ip)] };
}
