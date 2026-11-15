import { type CardId, cardFromId, cardId, formatCards, parseCards } from "@/lib/poker/card";
import { parseRange } from "@/lib/poker/range";
import type { Codec } from "@/lib/url-state";
import { type EquityInput, type EquityPlayer, MAX_PLAYERS } from "./engine";

/** A player as entered in the Equity tool; a hand may be incomplete and a Range is its range string. */
export type SetupPlayer = { kind: "hand"; cards: CardId[] } | { kind: "range"; range: string } | { kind: "random" };

export type EquitySetup = { players: SetupPlayer[]; board: CardId[]; dead: CardId[] };

export const MAX_DEAD_CARDS = 16;

export const DEFAULT_PLAYERS: SetupPlayer[] = [
  { cards: [], kind: "hand" },
  { cards: [], kind: "hand" },
];

function parseCardIds(text: string, max: number): CardId[] | null {
  const cards = parseCards(text);
  return cards && cards.length <= max ? cards.map(cardId) : null;
}

const formatCardIds = (cards: readonly CardId[]) => formatCards(cards.map(cardFromId));

// Players are joined by "_", which range strings never use and URLs leave unescaped.
// A hand is its cards ("AsKd", "" when empty), random is "*", and a Range is "r." plus its range string.
function parsePlayer(text: string): SetupPlayer {
  if (text === "*") return { kind: "random" };
  if (text.startsWith("r.")) return { kind: "range", range: text.slice(2) };
  return { cards: parseCardIds(text, 2) ?? [], kind: "hand" };
}

function formatPlayer(player: SetupPlayer): string {
  if (player.kind === "random") return "*";
  if (player.kind === "range") return `r.${player.range.replaceAll(" ", "")}`;
  return formatCardIds(player.cards);
}

export const playersCodec: Codec<SetupPlayer[]> = {
  parse: (raw) => {
    if (raw === null) return DEFAULT_PLAYERS;
    const players = raw.split("_").slice(0, MAX_PLAYERS).map(parsePlayer);
    while (players.length < 2) players.push({ cards: [], kind: "hand" });
    return players;
  },
  serialize: (players) => {
    const raw = players.map(formatPlayer).join("_");
    return raw === DEFAULT_PLAYERS.map(formatPlayer).join("_") ? null : raw;
  },
};

const cardsCodec = (max: number): Codec<CardId[]> => ({
  parse: (raw) => parseCardIds(raw ?? "", Number.POSITIVE_INFINITY)?.slice(0, max) ?? [],
  serialize: (cards) => (cards.length === 0 ? null : formatCardIds(cards)),
});

export const boardCodec = cardsCodec(5);
export const deadCodec = cardsCodec(MAX_DEAD_CARDS);

/** Engine input, or the first thing still missing. Card clashes are left to the engine to report. */
export function toEquityInput(setup: EquitySetup): { ok: true; input: EquityInput } | { ok: false; reason: string } {
  const players: EquityPlayer[] = [];
  for (const [index, player] of setup.players.entries()) {
    const name = `Player ${index + 1}`;
    if (player.kind === "hand") {
      if (player.cards.length !== 2) return { ok: false, reason: `Pick two cards for ${name}.` };
      players.push({ cards: player.cards, kind: "hand" });
    } else if (player.kind === "range") {
      const parsed = parseRange(player.range);
      if (!parsed.ok) return { ok: false, reason: `${name}'s range: ${parsed.error}` };
      if (!parsed.range.some((weight) => weight > 0)) return { ok: false, reason: `Paint a range for ${name}.` };
      players.push({ kind: "range", range: parsed.range });
    } else players.push({ kind: "random" });
  }
  return { input: { board: setup.board, dead: setup.dead, players }, ok: true };
}
