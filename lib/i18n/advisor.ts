import type { NoPostflop, OpponentLine, OpponentNote, OpponentProblem, PostflopReason } from "@/lib/advisor/postflop";
import type { AdviceContext, ChartNote, ChartRef, PreflopProblem, PreflopSituation, Verdict } from "@/lib/advisor/preflop";
import { formatBb } from "@/lib/format";
import { HAND_CLASS_NAMES } from "@/lib/poker/combo";
import { STACK_TIER_LABELS } from "@/lib/poker/table";
import { describeChart, describePushFold } from "./charts";
import type { Locale } from "./locale";
import { messages } from "./messages";

export function preflopProblemText(problem: PreflopProblem, locale: Locale): string {
  const t = messages(locale).advisor;
  switch (problem.code) {
    case "no-stack":
      return t.noStack;
    case "no-position":
      return t.noPosition(problem.position, problem.players);
    case "nobody-before":
      return t.nobodyBefore(problem.position);
    case "fewer-than-two":
      return t.fewerThanTwo(problem.position);
    case "opener-first":
      return t.openerFirst;
    case "pusher-first":
      return t.pusherFirst;
  }
}

export const chartTitle = (chart: ChartRef, locale: Locale): string => (chart.kind === "chart" ? describeChart(chart.key, locale) : describePushFold(chart.key, locale));

export function chartNoteText(note: ChartNote, locale: Locale): string {
  const t = messages(locale).advisor;
  return note.code === "vs-push-capped" ? t.vsPushCapped(note.depth) : t.belowPushFold;
}

function situationText(situation: PreflopSituation, locale: Locale): string {
  const t = messages(locale).advisor;
  if (situation.kind === "folded") return t.foldedToYou;
  if (situation.kind === "limps") return t.limpersBefore(situation.limpers);
  if (situation.kind === "open") return t.openedBy(situation.opener);
  return t.pushedBy(situation.pusher);
}

/** "AKo in CO, 15–20bb, folded to you". */
export function adviceContextText({ handClass, position, depth, situation }: AdviceContext, locale: Locale): string {
  const stack = "bb" in depth ? formatBb(depth.bb, locale) : STACK_TIER_LABELS[depth.tier];
  return messages(locale).advisor.context(HAND_CLASS_NAMES[handClass], position, stack, situationText(situation, locale));
}

export const verdictTitle = (verdict: Verdict, locale: Locale): string => messages(locale).actions[verdict.name];

/** "to 2.5bb", "to 2.5bb (500 chips)" with the big blind in chips, "all-in", or null when the action has no size. */
export function verdictSize(verdict: Verdict, locale: Locale, bigBlind?: number): string | null {
  const t = messages(locale).advisor;
  if (verdict.allIn) return t.allIn;
  if (verdict.sizeBb === null) return null;
  return t.raiseTo(verdict.sizeBb, bigBlind ? Math.round(verdict.sizeBb * bigBlind) : null);
}

export function postflopUnavailableText(reason: NoPostflop, locale: Locale): string {
  if (reason.code === "invalid") return preflopProblemText(reason.problem, locale);
  return reason.code === "walk" ? messages(locale).advisor.walkReason : messages(locale).postflop.noPostflop;
}

export function postflopReasonText(reason: PostflopReason, locale: Locale): string {
  const t = messages(locale).postflop;
  switch (reason.code) {
    case "short":
      return t.short(reason.equity, reason.needed);
    case "call-all-in":
      return t.callAllIn(reason.equity, reason.needed);
    case "beats":
      return t.beats(reason.equity, reason.needed);
    case "low-spr":
      return t.lowSpr(reason.equity, reason.spr);
    case "strong":
      return t.strong(reason.equity, reason.fair);
    case "weak":
      return t.weak(reason.equity, reason.fair);
  }
}

export const opponentLineText = (line: OpponentLine, locale: Locale): string => messages(locale).postflop.lines[line];

export function opponentNoteText(note: OpponentNote, locale: Locale): string {
  const t = messages(locale);
  if (note.code === "3-bet") return t.postflop.threeBetNote(note.position);
  if (note.code === "open-limp") return t.postflop.openLimpNote(t.charts.playerTypes[note.type], note.position);
  return t.postflop.isoRaiseNote;
}

export function opponentProblemText(problem: OpponentProblem, locale: Locale): string {
  const t = messages(locale);
  return problem.code === "folded-before" ? t.postflop.foldedBefore(problem.position) : t.postflop.neverLine(t.charts.playerTypes[problem.type], problem.position);
}
