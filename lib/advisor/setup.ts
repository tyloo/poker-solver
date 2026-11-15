import { BLIND_STRUCTURE } from "@/content/blind-structure";
import { LIMPER_GROUPS, type LimperGroup } from "@/lib/charts/model";
import { PLAYER_TYPES, type PlayerType } from "@/lib/charts/player-types";
import { blindLevel } from "@/lib/poker/blinds";
import { type CardId, cardFromId, cardId, formatCards, parseCards } from "@/lib/poker/card";
import { MAX_PLAYERS, MIN_PLAYERS, POSITIONS, type Position, tablePositions } from "@/lib/poker/table";
import type { Opponent } from "./postflop";
import type { PreflopQuestion } from "./preflop";

export const SITUATION_KINDS = ["folded", "limps", "open", "push"] as const;
export type SituationKind = (typeof SITUATION_KINDS)[number];

/** Chips at a Blind level (counted from 1), or a Stack depth typed in directly. `null` is an empty field. */
export type StackEntry = { unit: "chips"; chips: number | null; level: number } | { unit: "bb"; bb: number | null };

/** The Advisor's inputs as they live in the `/` query string. Pot and bet are in the stack's unit. */
export type AdvisorSetup = {
  /** Empty or two cards. */
  hand: CardId[];
  players: number;
  position: Position | null;
  situation: SituationKind;
  limpers: LimperGroup;
  opener: Position | null;
  pusher: Position | null;
  stack: StackEntry;
  board: CardId[];
  pot: number | null;
  bet: number | null;
  /** null: the likely opponents for the Preflop line, all Standard. */
  opponents: Opponent[] | null;
};

export const ADVISOR_PARAMS = {
  bb: "bb",
  bet: "bet",
  board: "board",
  chips: "chips",
  hand: "hand",
  level: "level",
  limpers: "limpers",
  opener: "opener",
  opponents: "opp",
  players: "players",
  position: "pos",
  pot: "pot",
  pusher: "pusher",
  situation: "sit",
} as const;

export const DEFAULT_SETUP: AdvisorSetup = {
  bet: null,
  board: [],
  hand: [],
  limpers: "1",
  opener: null,
  opponents: null,
  players: MAX_PLAYERS,
  position: null,
  pusher: null,
  pot: null,
  situation: "folded",
  stack: { chips: BLIND_STRUCTURE.startingStack, level: 1, unit: "chips" },
};

const TYPE_CODES: Record<PlayerType, string> = { loose: "l", standard: "s", tight: "t" };
const NO_OPPONENTS = "none";

const pick = <T extends string>(values: readonly T[], raw: string | null): T | null => (values.includes(raw as T) ? (raw as T) : null);

function parseNumber(raw: string | null, valid: (value: number) => boolean): number | null {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && valid(value) ? value : null;
}

const formatNumber = (value: number | null) => (value === null ? "" : String(Math.round(value * 100) / 100));

function parseCardList(raw: string | null, max: number): CardId[] {
  const cards = parseCards(raw ?? "");
  return cards && cards.length <= max ? cards.map(cardId) : [];
}

const formatCardList = (cards: readonly CardId[]) => (cards.length === 0 ? null : formatCards(cards.map(cardFromId)));

function parseOpponents(raw: string | null): Opponent[] | null {
  if (raw === null) return null;
  if (raw === NO_OPPONENTS) return [];
  const opponents: Opponent[] = [];
  for (const entry of raw.split("_")) {
    const [position, code] = entry.split(".");
    const type = PLAYER_TYPES.find((candidate) => TYPE_CODES[candidate] === code);
    if (POSITIONS.includes(position as Position) && type && !opponents.some((other) => other.position === position)) opponents.push({ position: position as Position, type });
  }
  return opponents;
}

function formatOpponents(opponents: readonly Opponent[] | null): string | null {
  if (opponents === null) return null;
  if (opponents.length === 0) return NO_OPPONENTS;
  return opponents.map(({ position, type }) => `${position}.${TYPE_CODES[type]}`).join("_");
}

export function parseAdvisorParams(params: Pick<URLSearchParams, "get" | "has">): AdvisorSetup {
  const get = (name: keyof typeof ADVISOR_PARAMS) => params.get(ADVISOR_PARAMS[name]);
  const hand = parseCardList(get("hand"), 2);
  const chips = get("chips");
  const stack: StackEntry = params.has(ADVISOR_PARAMS.bb)
    ? { bb: parseNumber(get("bb"), (value) => value > 0), unit: "bb" }
    : {
        chips: chips === null ? BLIND_STRUCTURE.startingStack : parseNumber(chips, (value) => value > 0),
        level: parseNumber(get("level"), (value) => Number.isInteger(value) && value >= 1) ?? 1,
        unit: "chips",
      };
  return {
    bet: parseNumber(get("bet"), (value) => value >= 0),
    board: parseCardList(get("board"), 5),
    hand: hand.length === 2 ? hand : [],
    limpers: pick(LIMPER_GROUPS, get("limpers")) ?? DEFAULT_SETUP.limpers,
    opener: pick(POSITIONS, get("opener")),
    opponents: parseOpponents(get("opponents")),
    players: parseNumber(get("players"), (value) => Number.isInteger(value) && value >= MIN_PLAYERS && value <= MAX_PLAYERS) ?? DEFAULT_SETUP.players,
    position: pick(POSITIONS, get("position")),
    pot: parseNumber(get("pot"), (value) => value > 0),
    pusher: pick(POSITIONS, get("pusher")),
    situation: pick(SITUATION_KINDS, get("situation")) ?? DEFAULT_SETUP.situation,
    stack,
  };
}

/** Query params for the given fields; defaults are null so they leave the URL. */
export function advisorParams(setup: Partial<AdvisorSetup>): Record<string, string | null> {
  const values: Record<string, string | null> = {};
  const set = (name: keyof typeof ADVISOR_PARAMS, value: string | null) => {
    values[ADVISOR_PARAMS[name]] = value;
  };
  const orNull = <T>(value: T, fallback: T) => (value === fallback ? null : String(value));
  if (setup.hand !== undefined) set("hand", setup.hand.length === 2 ? formatCardList(setup.hand) : null);
  if (setup.players !== undefined) set("players", orNull(setup.players, DEFAULT_SETUP.players));
  if (setup.position !== undefined) set("position", setup.position);
  if (setup.situation !== undefined) set("situation", orNull(setup.situation, DEFAULT_SETUP.situation));
  if (setup.limpers !== undefined) set("limpers", orNull(setup.limpers, DEFAULT_SETUP.limpers));
  if (setup.opener !== undefined) set("opener", setup.opener);
  if (setup.pusher !== undefined) set("pusher", setup.pusher);
  if (setup.stack !== undefined) {
    const { stack } = setup;
    if (stack.unit === "bb") {
      set("bb", formatNumber(stack.bb));
      set("chips", null);
      set("level", null);
    } else {
      set("bb", null);
      set("chips", stack.chips === BLIND_STRUCTURE.startingStack ? null : formatNumber(stack.chips));
      set("level", orNull(stack.level, 1));
    }
  }
  if (setup.board !== undefined) set("board", formatCardList(setup.board));
  if (setup.pot !== undefined) set("pot", setup.pot === null ? null : formatNumber(setup.pot));
  if (setup.bet !== undefined) set("bet", setup.bet === null ? null : formatNumber(setup.bet));
  if (setup.opponents !== undefined) set("opponents", formatOpponents(setup.opponents));
  return values;
}

/** The hero's Stack depth in bb; NaN while the field is empty. */
export function stackDepthOf(stack: StackEntry): number {
  if (stack.unit === "bb") return stack.bb ?? Number.NaN;
  if (stack.chips === null) return Number.NaN;
  return stack.chips / blindLevel(BLIND_STRUCTURE, stack.level).bb;
}

/** The big blind in chips, known only when the stack is entered in chips. */
export const bigBlindChips = (stack: StackEntry): number | undefined => (stack.unit === "chips" ? blindLevel(BLIND_STRUCTURE, stack.level).bb : undefined);

/** An amount in the stack's unit (chips or bb), in bb. */
export const toUnit = (amount: number, stack: StackEntry): number => amount / (bigBlindChips(stack) ?? 1);

export type QuestionOrMissing = { question: PreflopQuestion } | { missing: "hand" | "position" | "opener" | "pusher" };

/** The preflop question, or the first input still missing. */
export function preflopQuestion(setup: AdvisorSetup): QuestionOrMissing {
  const { hand, players, position, situation } = setup;
  if (hand.length !== 2) return { missing: "hand" };
  if (!position || !tablePositions(players).includes(position)) return { missing: "position" };
  const base = { depth: stackDepthOf(setup.stack), hand: [hand[0], hand[1]] as const, players, position };
  if (situation === "folded") return { question: { ...base, situation: { kind: "folded" } } };
  if (situation === "limps") return { question: { ...base, situation: { kind: "limps", limpers: setup.limpers } } };
  if (situation === "open") return setup.opener ? { question: { ...base, situation: { kind: "open", opener: setup.opener } } } : { missing: "opener" };
  return setup.pusher ? { question: { ...base, situation: { kind: "push", pusher: setup.pusher } } } : { missing: "pusher" };
}

/** A typed amount: accepts "12 500" and "12,500", and for bb the decimal comma "12,5". Null when empty or invalid. */
export function parseAmount(text: string, { decimal = false, allowZero = false }: { decimal?: boolean; allowZero?: boolean } = {}): number | null {
  const spaced = text.replace(/[\s\u00a0\u202f]/g, "");
  const cleaned = decimal ? spaced.replace(",", ".") : spaced.replace(/[,.]/g, "");
  if (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && (allowZero ? value >= 0 : value > 0) ? value : null;
}
