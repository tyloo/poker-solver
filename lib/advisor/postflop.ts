import { estimateRange, getChart } from "@/lib/charts/charts";
import { type ActionId, type ChartKey, chartKeyFor, DEFAULT_SELECTION, openerGroupOf } from "@/lib/charts/model";
import { PLAYER_TYPE_LABELS, type PlayerType } from "@/lib/charts/player-types";
import type { CardId } from "@/lib/poker/card";
import type { Range } from "@/lib/poker/range";
import { type Position, postflopOrder, preflopOrder, tablePositions } from "@/lib/poker/table";
import { isValidLine, type PreflopLine } from "@/lib/solver/preflop-line";
import type { SolverLink } from "@/lib/solver/spot-url";
import { type PreflopAdvice, type PreflopQuestion, positionsBefore } from "./preflop";

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

export type PostflopVerdict = { kind: PostflopVerdictKind; title: string; reason: string };

const percent = (share: number) => `${Number((share * 100).toFixed(1))}%`;
const ratio = (value: number) => `${Number(value.toFixed(1))}`;

/**
 * Heuristic, not a solve. Facing a bet: call when equity beats the price, push instead when the SPR is low, else fold.
 * First to act: bet when equity is well above a fair share of the pot, else check.
 */
export function postflopVerdict({ equity, opponents, ...amounts }: PostflopAmounts & { equity: number; opponents: number }): PostflopVerdict {
  const { call, requiredEquity, spr } = postflopNumbers(amounts);
  if (call > 0) {
    if (equity < requiredEquity) return { kind: "fold", reason: `${percent(equity)} equity is short of the ${percent(requiredEquity)} the price needs.`, title: "Fold" };
    if (call >= amounts.stack)
      return { kind: "call", reason: `${percent(equity)} equity beats the ${percent(requiredEquity)} the price needs, and calling puts you all-in.`, title: "Call" };
    if (spr <= LOW_SPR) return { kind: "push", reason: `${percent(equity)} equity beats the price, and an SPR of ${ratio(spr)} is too low to just call.`, title: "Push" };
    return { kind: "call", reason: `${percent(equity)} equity beats the ${percent(requiredEquity)} the price needs.`, title: "Call" };
  }
  const strong = 1 / (opponents + 1) + STRONG_MARGIN;
  if (equity >= strong) return { kind: "bet", reason: `${percent(equity)} equity is well above your ${percent(1 / (opponents + 1))} share.`, title: "Bet" };
  return { kind: "check", reason: `${percent(equity)} equity is not far enough above your ${percent(1 / (opponents + 1))} share to bet.`, title: "Check" };
}

/** How the hero reached the flop: their raising Chart and the action they took from it. */
export type PostflopLine = { question: PreflopQuestion; key: ChartKey; heroAction: ActionId };

export function postflopLine(question: PreflopQuestion, advice: PreflopAdvice): { ok: true; line: PostflopLine } | { ok: false; reason: string } {
  if (advice.kind !== "advice") return { ok: false, reason: advice.reason };
  if (advice.chart.kind === "push-fold") return { ok: false, reason: "Push/fold hands go all-in preflop, so there is no postflop decision." };
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

export type OpponentRange = { ok: true; range: Range; line: string; note: string | null } | { ok: false; error: string };

/** The estimated Range of an opponent of a Player type, from the Preflop line. */
export function opponentRange(line: PostflopLine, { position, type }: Opponent): OpponentRange {
  if (!opponentPositions(line).includes(position)) return { error: `${position} folded before the flop.`, ok: false };
  const { question, key, heroAction } = line;
  const { tier } = key;
  const hero = question.position;
  const { situation } = question;
  const name = PLAYER_TYPE_LABELS[type];

  const from = (chart: ChartKey, action: ActionId, description: string, note: string | null = null): OpponentRange => {
    const range = estimateRange(type, chart, action);
    if (!range) return { error: `${name} players never take that line from ${position}.`, ok: false };
    return { line: description, note, ok: true, range };
  };
  const callerOf = (opener: Position, description: string, note: string | null = null) =>
    from({ opener: openerGroupOf(opener) ?? "late", position, situation: "vs-open", tier }, "call", description, note);

  if (situation.kind === "open") {
    if (position === situation.opener) {
      return heroAction === "raise"
        ? from({ position, situation: "open", tier }, "raise", "called your 3-bet", `No Chart covers calling a 3-bet, so this is ${position}'s open Range.`)
        : from({ position, situation: "open", tier }, "raise", "opened");
    }
    return callerOf(situation.opener, "called the open");
  }
  if (situation.kind === "folded") {
    if (heroAction === "limp" && position === "BB") return from({ limpers: "1", position, situation: "vs-limpers", tier }, "check", "checked");
    return callerOf(hero, "called your open");
  }
  // Behind limpers.
  if (preflopOrder(position) < preflopOrder(hero)) {
    if (estimateRange(type, { position, situation: "open", tier }, "limp")) return from({ position, situation: "open", tier }, "limp", "limped");
    const overlimp = chartKeyFor({ ...DEFAULT_SELECTION, limpers: "1", position, situation: "vs-limpers", tier });
    return from(overlimp, "limp", "limped", `${name} players never open-limp from ${position} in the repo data, so this is their overlimp Range.`);
  }
  if (heroAction === "raise") return callerOf(hero, "called your raise", "No Chart covers calling an iso-raise, so this is the Vs open call Range.");
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
