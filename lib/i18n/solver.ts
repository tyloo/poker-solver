import { type CardId, cardFromId, formatCards } from "@/lib/poker/card";
import { OPEN_SIZE_BB, stackTierFor } from "@/lib/poker/table";
import { formatChips, type StepSource } from "@/lib/solver/display";
import type { SolverError, SpotProblem } from "@/lib/solver/errors";
import { type LineError, MIN_DEPTH, type PreflopLine } from "@/lib/solver/preflop-line";
import type { SetupProblem } from "@/lib/solver/spot-setup";
import type { SolverAction } from "@/lib/solver/tree";
import type { Locale } from "./locale";
import { messages } from "./messages";
import { rangeErrorText } from "./range";

/** [OOP, IP] names, e.g. Positions from the Preflop line. */
type Players = readonly [string, string];

export function actionLabel(action: SolverAction, locale: Locale): string {
  const t = messages(locale).strategy.actionLabels;
  switch (action.kind) {
    case "check":
      return t.check;
    case "fold":
      return t.fold;
    case "call":
      return t.call(formatChips(action.amount, locale));
    case "bet":
      return t.bet(formatChips(action.to, locale));
    case "raise":
      return t.raise(formatChips(action.to, locale));
    case "allin":
      return t.allin(formatChips(action.to, locale));
  }
}

/** "BTN bets 1.82bb". */
export function actionPhrase(player: string, action: SolverAction, locale: Locale): string {
  const t = messages(locale).strategy.phrases;
  switch (action.kind) {
    case "check":
      return t.check(player);
    case "fold":
      return t.fold(player);
    case "call":
      return t.call(player, formatChips(action.amount, locale));
    case "bet":
      return t.bet(player, formatChips(action.to, locale));
    case "raise":
      return t.raise(player, formatChips(action.to, locale));
    case "allin":
      return t.allin(player, formatChips(action.to, locale));
  }
}

/** "Turn 7c": the card a chance node deals after a board of `boardCards`. */
export function chanceLabel(card: CardId, boardCards: number, locale: Locale): string {
  const t = messages(locale).strategy;
  const name = formatCards([cardFromId(card)]);
  return boardCards === 3 ? t.turn(name) : t.river(name);
}

/** The step out of `node` along `index`: "BTN bets 1.82bb" or "Turn 9c"; null when the node has no such step (an invalid or stale path). */
export function stepLabel(node: StepSource, index: number, players: Players, locale: Locale): string | null {
  if (node.kind === "chance") return index < node.cards.length ? chanceLabel(node.cards[index], node.board.length, locale) : null;
  if (node.kind !== "action" || node.player === null || index >= node.actions.length) return null;
  return actionPhrase(players[node.player], node.actions[index], locale);
}

/** "CO opens 2.5bb, BB calls, 40bb". */
export function describeLine(line: PreflopLine, depth: number, locale: Locale): string {
  const t = messages(locale).solver;
  if (line.kind === "limp") return t.limpLine(depth);
  const tier = stackTierFor(depth);
  return t.openLine(line.opener, tier === "push-fold" ? null : OPEN_SIZE_BB[tier], line.caller, depth);
}

/** Why a Preflop line has no Spot, without a full stop. */
export function lineErrorText(error: LineError, locale: Locale): string {
  const t = messages(locale).solver;
  if (error === "below-min") return t.belowMin(MIN_DEPTH);
  return error === "caller-after" ? t.callerAfter : t.openerBeforeBb;
}

function spotProblemText(problem: SpotProblem, players: Players, locale: Locale): string {
  const t = messages(locale).solver;
  switch (problem.code) {
    case "board-cards":
      return t.boardCards;
    case "bad-card":
      return t.badCard;
    case "pot":
      return t.potPositive;
    case "stack":
      return t.stackNegative;
    case "bet-sizes":
      return t.betsPositive;
    case "raise-sizes":
      return t.raisesAbove;
    case "raise-cap":
      return t.raiseCap;
    case "flop-one-bet":
      return t.flopOneBet;
    case "empty-range":
      return t.emptyRange(players[problem.player]);
  }
}

/** What the Solver setup still needs, in a sentence. */
export function setupProblemText(problem: SetupProblem, players: Players, locale: Locale): string {
  const t = messages(locale).solver;
  switch (problem.code) {
    case "line":
      return `${lineErrorText(problem.error, locale)}.`;
    case "pick-board":
      return t.pickBoard;
    case "set-amounts":
      return t.setAmounts;
    case "range":
      return t.rangeError(players[problem.player], rangeErrorText(problem.error, locale));
    case "paint":
      return t.paintFor(players[problem.player]);
    case "spot":
      return `${spotProblemText(problem.problem, players, locale)}.`;
  }
}

/** A refusal or failure from the Solver engine, its worker or its client, in a sentence. */
export function solverErrorText(error: SolverError, players: Players, locale: Locale): string {
  const t = messages(locale).solver.errors;
  switch (error.code) {
    case "spot":
      return `${spotProblemText(error.problem, players, locale)}.`;
    case "over-budget":
      return t.overBudget(error.memoryBytes, error.budgetBytes, error);
    case "bad-path":
      return t.badPath(error.step);
    case "internal":
      return t.internal(error.message);
    default:
      return t[error.code];
  }
}
