import { type CardId, cardFromId, cardId, formatCards, parseCards } from "@/lib/poker/card";
import { formatRange, type Range } from "@/lib/poker/range";
import { POSITIONS, type Position } from "@/lib/poker/table";
import { DEFAULT_DEPTH, DEFAULT_LINE, isValidLine, type OpenerPosition, type PreflopLine } from "./preflop-line";

/**
 * The Solver's Spot setup as it lives in the `/solver` query string. Amounts are in bb.
 * `pot`, `stack` and the Ranges are overrides: when absent they come from the Preflop line.
 */
export type SpotSetup = {
  /** null: no Preflop line (`line=none`), so the pot, stack and both Ranges must be given. */
  line: PreflopLine | null;
  /** Starting Stack depth before the hand, in bb; picks the Stack tier of the line's Charts. */
  depth: number;
  board: CardId[];
  /** Pot at the start of the Spot, in bb. */
  pot: number | null;
  /** Effective stack behind at the start of the Spot, in bb. */
  stack: number | null;
  /** [OOP, IP] range strings. */
  ranges: [string | null, string | null];
  /** Bet sizes in % of the pot (all-in is always added); null uses the street's defaults. */
  bets: number[] | null;
  /** Raise size as a multiple of the bet faced (turn and river Spots). */
  raise: number;
  /** The hero's Combo, whose Hand class the results open on. Empty or two cards. */
  hand: CardId[];
};

/** Query-param names, in the order links write them. */
export const SPOT_PARAMS = {
  line: "line",
  depth: "depth",
  board: "board",
  pot: "pot",
  stack: "stack",
  oop: "oop",
  ip: "ip",
  bets: "bets",
  raise: "raise",
  hand: "hand",
} as const;

export const DEFAULT_RAISE = 3;

export const DEFAULT_SETUP: SpotSetup = {
  bets: null,
  board: [],
  depth: DEFAULT_DEPTH,
  hand: [],
  line: DEFAULT_LINE,
  pot: null,
  raise: DEFAULT_RAISE,
  ranges: [null, null],
  stack: null,
};

const LIMP = "limp";
const NONE = "none";

function parseLine(raw: string | null): PreflopLine | null {
  if (raw === LIMP) return { kind: "limp" };
  if (raw === NONE) return null;
  const [opener, caller, ...rest] = (raw ?? "").split("_");
  if (rest.length > 0 || !POSITIONS.includes(opener as Position) || !POSITIONS.includes(caller as Position) || opener === "BB") return DEFAULT_LINE;
  const line: PreflopLine = { caller: caller as Position, kind: "open", opener: opener as OpenerPosition };
  return isValidLine(line) ? line : DEFAULT_LINE;
}

const sameLine = (a: PreflopLine, b: PreflopLine) => (a.kind === "limp" ? b.kind === "limp" : b.kind === "open" && a.opener === b.opener && a.caller === b.caller);

function formatLine(line: PreflopLine | null): string | null {
  if (line === null) return NONE;
  if (sameLine(line, DEFAULT_LINE)) return null;
  return line.kind === "limp" ? LIMP : `${line.opener}_${line.caller}`;
}

function parseNumber(raw: string | null, valid: (value: number) => boolean): number | null {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && valid(value) ? value : null;
}

const formatAmount = (value: number) => String(Math.round(value * 100) / 100);

function parseCardList(raw: string | null, max: number): CardId[] {
  const cards = parseCards(raw ?? "");
  return cards ? cards.slice(0, max).map(cardId) : [];
}

const formatCardList = (cards: readonly CardId[]) => (cards.length === 0 ? null : formatCards(cards.map(cardFromId)));

function parseBets(raw: string | null): number[] | null {
  const sizes = (raw ?? "")
    .split("_")
    .map((text) => parseNumber(text, (value) => value > 0 && value <= 1000))
    .filter((value): value is number => value !== null);
  return sizes.length === 0 ? null : normalizeBets(sizes);
}

const normalizeBets = (sizes: readonly number[]) => [...new Set(sizes.map((size) => Math.round(size * 100) / 100))].sort((a, b) => a - b);

export function parseSpotParams(params: Pick<URLSearchParams, "get">): SpotSetup {
  const get = (name: keyof typeof SPOT_PARAMS) => params.get(SPOT_PARAMS[name]);
  const hand = parseCardList(get("hand"), 2);
  return {
    bets: parseBets(get("bets")),
    board: parseCardList(get("board"), 5),
    depth: parseNumber(get("depth"), (value) => value > 0) ?? DEFAULT_DEPTH,
    hand: hand.length === 2 ? hand : [],
    line: parseLine(get("line")),
    pot: parseNumber(get("pot"), (value) => value > 0),
    raise: parseNumber(get("raise"), (value) => value > 1) ?? DEFAULT_RAISE,
    ranges: [get("oop"), get("ip")],
    stack: parseNumber(get("stack"), (value) => value >= 0),
  };
}

const formatRangeText = (text: string | null) => (text === null ? null : text.replaceAll(" ", ""));

/** Query params for the given setup fields; defaults are null so they leave the URL. */
export function spotParams(setup: Partial<SpotSetup>): Record<string, string | null> {
  const values: Record<string, string | null> = {};
  if (setup.line !== undefined) values[SPOT_PARAMS.line] = formatLine(setup.line);
  if (setup.depth !== undefined) values[SPOT_PARAMS.depth] = setup.depth === DEFAULT_DEPTH ? null : formatAmount(setup.depth);
  if (setup.board !== undefined) values[SPOT_PARAMS.board] = formatCardList(setup.board);
  if (setup.pot !== undefined) values[SPOT_PARAMS.pot] = setup.pot === null ? null : formatAmount(setup.pot);
  if (setup.stack !== undefined) values[SPOT_PARAMS.stack] = setup.stack === null ? null : formatAmount(setup.stack);
  if (setup.ranges !== undefined) {
    values[SPOT_PARAMS.oop] = formatRangeText(setup.ranges[0]);
    values[SPOT_PARAMS.ip] = formatRangeText(setup.ranges[1]);
  }
  if (setup.bets !== undefined) values[SPOT_PARAMS.bets] = setup.bets === null ? null : normalizeBets(setup.bets).join("_");
  if (setup.raise !== undefined) values[SPOT_PARAMS.raise] = setup.raise === DEFAULT_RAISE ? null : String(setup.raise);
  if (setup.hand !== undefined) values[SPOT_PARAMS.hand] = setup.hand.length === 2 ? formatCardList(setup.hand) : null;
  return values;
}

/** A Spot to open in the Solver, e.g. from the Advisor. Every field is optional; amounts are in bb. */
export type SolverLink = {
  /** Labels the players by Position and fills whatever else is missing. Without it, give the pot, stack and Ranges. */
  line?: PreflopLine;
  depth?: number;
  board?: readonly CardId[];
  /** Pot at the start of the street, in bb. */
  pot?: number;
  /** Effective stack behind at the start of the street, in bb. */
  stack?: number;
  /** [OOP, IP], as Ranges or range strings. */
  ranges?: readonly [Range | string, Range | string];
  /** Fractions of the pot, as in `Spot.betSizes` (e.g. 0.33). */
  betSizes?: readonly number[];
  /** Multiple of the bet faced. */
  raiseSize?: number;
  /** The hero's two cards. */
  hand?: readonly CardId[];
};

/** `/solver?…` for a Spot. Params are written in `SPOT_PARAMS` order and encoded, so range strings survive. */
export function solverHref(link: SolverLink): string {
  const rangeText = (range: Range | string) => (typeof range === "string" ? range : formatRange(range));
  const values = spotParams({
    ...((link.line || link.ranges) && { line: link.line ?? null }),
    ...(link.depth !== undefined && { depth: link.depth }),
    ...(link.board && { board: [...link.board] }),
    ...(link.pot !== undefined && { pot: link.pot }),
    ...(link.stack !== undefined && { stack: link.stack }),
    ...(link.ranges && { ranges: [rangeText(link.ranges[0]), rangeText(link.ranges[1])] as [string, string] }),
    ...(link.betSizes && { bets: link.betSizes.map((size) => size * 100) }),
    ...(link.raiseSize !== undefined && { raise: link.raiseSize }),
    ...(link.hand && { hand: [...link.hand] }),
  });
  const params = new URLSearchParams();
  for (const name of Object.values(SPOT_PARAMS)) {
    const value = values[name];
    if (value !== undefined && value !== null) params.set(name, value);
  }
  const query = params.toString();
  return query ? `/solver?${query}` : "/solver";
}
