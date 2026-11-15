import { estimateRange, getChart } from "@/lib/charts/charts";
import { type ActionId, type ChartKey, chartKeyFor, DEFAULT_SELECTION, openerGroupOf } from "@/lib/charts/model";
import type { PlayerType } from "@/lib/charts/player-types";
import type { CardId } from "@/lib/poker/card";
import type { Range } from "@/lib/poker/range";
import { type Position, postflopOrder, preflopOrder, tablePositions } from "@/lib/poker/table";
import { isValidLine, type PreflopLine } from "@/lib/solver/preflop-line";
import type { SolverLink } from "@/lib/solver/spot-url";
import { type PreflopAdvice, type PreflopProblem, type PreflopQuestion, positionsBefore } from "./preflop";

/** Facing a bet, an SPR at or below this turns a call into a push. */
export const LOW_SPR = 2;
/** First to act, bet when equity beats a fair share (1 / players in the pot) by this much. */
export const STRONG_MARGIN = 0.1;

/** Amounts in one unit (chips or bb): the pot before the bet faced, the bet faced (0 when first to act) and the hero's stack behind. */
export type PostflopAmounts = { pot: number; bet: number; stack: number };

export type PostflopNumbers = {
  /** What calling costs: the bet, capped at the hero's stack. */
  call: number;
  /** (pot + call) : call, as the left-hand number; Infinity when there is nothing to call. */
  potOdds: number;
  /** Share of the final pot the call needs to break even. */
  requiredEquity: number;
  /** Stack-to-pot ratio at the start of the street. */
  spr: number;
};

export function postflopNumbers({ pot, bet, stack }: PostflopAmounts): PostflopNumbers {
  const call = Math.min(bet, stack);
  // An all-in call for less than the bet gets the uncalled part back.
  const requiredEquity = call > 0 ? call / (pot + 2 * call) : 0;
  return { call, potOdds: call > 0 ? (pot + call) / call : Number.POSITIVE_INFINITY, requiredEquity, spr: stack / pot };
}

export type PostflopVerdictKind = "call" | "fold" | "push" | "bet" | "check";

/** The numbers behind a verdict: equity against the `needed` price, the SPR, or the `fair` share of the pot. */
export type PostflopReason =
  | { code: "short" | "call-all-in" | "beats"; equity: number; needed: number }
  | { code: "low-spr"; equity: number; spr: number }
  | { code: "strong" | "weak"; equity: number; fair: number };

export type PostflopVerdict = { kind: PostflopVerdictKind; reason: PostflopReason };

/**
 * Heuristic, not a solve. Facing a bet: call when equity beats the price, push instead when the SPR is low, else fold.
 * First to act: bet when equity is well above a fair share of the pot, else check.
 */
export function postflopVerdict({ equity, opponents, ...amounts }: PostflopAmounts & { equity: number; opponents: number }): PostflopVerdict {
  const { call, requiredEquity: needed, spr } = postflopNumbers(amounts);
  if (call > 0) {
    if (equity < needed) return { kind: "fold", reason: { code: "short", equity, needed } };
    if (call >= amounts.stack) return { kind: "call", reason: { code: "call-all-in", equity, needed } };
    if (spr <= LOW_SPR) return { kind: "push", reason: { code: "low-spr", equity, spr } };
    return { kind: "call", reason: { code: "beats", equity, needed } };
  }
  const fair = 1 / (opponents + 1);
  return equity >= fair + STRONG_MARGIN ? { kind: "bet", reason: { code: "strong", equity, fair } } : { kind: "check", reason: { code: "weak", equity, fair } };
}

/** How the hero reached the flop: their raising Chart and the action they took from it. */
export type PostflopLine = { question: PreflopQuestion; key: ChartKey; heroAction: ActionId };

/** Why there is no postflop decision: a walk, an all-in preflop, or a question the Advisor cannot answer. */
export type NoPostflop = { code: "walk" | "push-fold" } | { code: "invalid"; problem: PreflopProblem };

export function postflopLine(question: PreflopQuestion, advice: PreflopAdvice): { ok: true; line: PostflopLine } | { ok: false; reason: NoPostflop } {
  if (advice.kind === "invalid") return { ok: false, reason: { code: "invalid", problem: advice.problem } };
  if (advice.kind === "walk") return { ok: false, reason: { code: "walk" } };
  if (advice.chart.kind === "push-fold") return { ok: false, reason: { code: "push-fold" } };
  // A hand the Chart folds is assumed to have played its most frequent other action (or the Chart's first one).
  const played = advice.actions.filter((action) => action.id !== "fold");
  const action = played.reduce((best, next) => (next.frequency > best.frequency ? next : best));
  return { line: { heroAction: action.id, key: advice.chart.key, question }, ok: true };
}

/** Positions that can still be in the pot. */
export function opponentPositions({ question }: PostflopLine): Position[] {
  const { players, position, situation } = question;
  const others = tablePositions(players).filter((other) => other !== position);
  if (situation.kind === "folded") return others.filter((other) => preflopOrder(other) > preflopOrder(position));
  if (situation.kind === "open") return others.filter((other) => preflopOrder(other) >= preflopOrder(situation.opener));
  return others;
}

/** Likely opponents: the BB against an open, the opener, or the limpers just before the hero. */
export function defaultOpponents(line: PostflopLine): Position[] {
  const { players, position, situation } = line.question;
  if (situation.kind === "folded") return ["BB"];
  if (situation.kind === "open") return [situation.opener];
  if (situation.kind === "limps") return positionsBefore(players, position).slice(situation.limpers === "1" ? -1 : -2);
  return [];
}

export type Opponent = { position: Position; type: PlayerType };

/** What the opponent did preflop to reach the flop. */
export type OpponentLine = "called-3-bet" | "opened" | "called-open" | "checked" | "called-your-open" | "limped" | "called-raise" | "overlimped";

/** Why the Range shown is a stand-in. */
export type OpponentNote = { code: "3-bet"; position: Position } | { code: "open-limp"; type: PlayerType; position: Position } | { code: "iso-raise" };

export type OpponentProblem = { code: "folded-before"; position: Position } | { code: "never-line"; type: PlayerType; position: Position };

export type OpponentRange = { ok: true; range: Range; line: OpponentLine; note: OpponentNote | null } | { ok: false; error: OpponentProblem };

/** The estimated Range of an opponent of a Player type, from the Preflop line. */
export function opponentRange(line: PostflopLine, { position, type }: Opponent): OpponentRange {
  if (!opponentPositions(line).includes(position)) return { error: { code: "folded-before", position }, ok: false };
  const { question, key, heroAction } = line;
  const { tier } = key;
  const hero = question.position;
  const { situation } = question;

  const from = (chart: ChartKey, action: ActionId, taken: OpponentLine, note: OpponentNote | null = null): OpponentRange => {
    const range = estimateRange(type, chart, action);
    if (!range) return { error: { code: "never-line", position, type }, ok: false };
    return { line: taken, note, ok: true, range };
  };
  const callerOf = (opener: Position, taken: OpponentLine, note: OpponentNote | null = null) =>
    from({ opener: openerGroupOf(opener) ?? "late", position, situation: "vs-open", tier }, "call", taken, note);

  if (situation.kind === "open") {
    if (position === situation.opener) {
      return heroAction === "raise"
        ? from({ position, situation: "open", tier }, "raise", "called-3-bet", { code: "3-bet", position })
        : from({ position, situation: "open", tier }, "raise", "opened");
    }
    return callerOf(situation.opener, "called-open");
  }
  if (situation.kind === "folded") {
    if (heroAction === "limp" && position === "BB") return from({ limpers: "1", position, situation: "vs-limpers", tier }, "check", "checked");
    return callerOf(hero, "called-your-open");
  }
  // Behind limpers.
  if (preflopOrder(position) < preflopOrder(hero)) {
    if (estimateRange(type, { position, situation: "open", tier }, "limp")) return from({ position, situation: "open", tier }, "limp", "limped");
    const overlimp = chartKeyFor({ ...DEFAULT_SELECTION, limpers: "1", position, situation: "vs-limpers", tier });
    return from(overlimp, "limp", "limped", { code: "open-limp", position, type });
  }
  if (heroAction === "raise") return callerOf(hero, "called-raise", { code: "iso-raise" });
  if (position === "BB") return from({ limpers: "2+", position, situation: "vs-limpers", tier }, "check", "checked");
  return from({ limpers: "2+", position, situation: "vs-limpers", tier }, "limp", "overlimped");
}

/** The hero's own Range: their Chart's Range for the action they took. */
export function heroRange({ key, heroAction }: PostflopLine): Range {
  const range = getChart(key).actions.find((action) => action.id === heroAction)?.range;
  if (!range) throw new Error(`The Chart has no ${heroAction} action`);
  return range;
}

/** The Solver's Preflop line for a heads-up pot, when it has one (single-raised or SB limp, BB check). */
function solverLine({ question, heroAction }: PostflopLine, opponent: Position): PreflopLine | undefined {
  const hero = question.position;
  const { situation } = question;
  const pair = (opener: Position, caller: Position): PreflopLine | undefined => {
    if (opener === "BB") return undefined;
    const line: PreflopLine = { caller, kind: "open", opener };
    return isValidLine(line) ? line : undefined;
  };
  if (situation.kind === "folded") {
    if (heroAction === "raise") return pair(hero, opponent);
    if (heroAction === "limp" && hero === "SB" && opponent === "BB") return { kind: "limp" };
  }
  if (situation.kind === "open" && heroAction === "call" && opponent === situation.opener) return pair(opponent, hero);
  if (situation.kind === "limps" && situation.limpers === "1" && heroAction === "check" && hero === "BB" && opponent === "SB") return { kind: "limp" };
  return undefined;
}

/** A heads-up Spot for the Solver; amounts in bb at the start of the street. */
export function solverLinkFor(input: {
  line: PostflopLine;
  opponent: { position: Position; range: Range };
  board: readonly CardId[];
  hand: readonly CardId[];
  pot: number;
  stack: number;
  /** The Blind level, when the stack is entered in chips. */
  level?: number;
}): SolverLink {
  const { line, opponent, board, hand, pot, stack, level } = input;
  const hero = heroRange(line);
  const heroFirst = postflopOrder(line.question.position) < postflopOrder(opponent.position);
  const preflop = solverLine(line, opponent.position);
  return {
    board,
    hand,
    pot,
    ranges: heroFirst ? [hero, opponent.range] : [opponent.range, hero],
    stack,
    ...(preflop && { depth: line.question.depth, line: preflop, ...(level !== undefined && { level }) }),
  };
}
