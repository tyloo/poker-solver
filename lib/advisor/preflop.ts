import { getChart, getPushFoldChart } from "@/lib/charts/charts";
import { type ActionColour, type ActionId, type ActionName, type ChartKey, chartHref, describeChart, LIMPER_GROUPS, type LimperGroup, openerGroupOf } from "@/lib/charts/model";
import { describePushFold, PUSH_FOLD_DEPTHS, type PushFoldDepth, type PushFoldKey, pushFoldHref } from "@/lib/charts/push-fold";
import { formatBb } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locale";
import { type Messages, messages } from "@/lib/i18n/messages";
import type { CardId } from "@/lib/poker/card";
import { comboId, HAND_CLASS_NAMES, handClassOfCombo } from "@/lib/poker/combo";
import { OPEN_SIZE_BB, type Position, STACK_TIER_LABELS, type StackTier, stackTierFor, tablePositions } from "@/lib/poker/table";

/** The preflop action before the hero. */
export type PreflopSituation = { kind: "folded" } | { kind: "limps"; limpers: LimperGroup } | { kind: "open"; opener: Position } | { kind: "push"; pusher: Position };

/** The hand and table the Advisor answers preflop. */
export type PreflopQuestion = {
  hand: readonly [CardId, CardId];
  /** Players dealt in, 2 to 8. */
  players: number;
  position: Position;
  /** The hero's Stack depth in bb. */
  depth: number;
  situation: PreflopSituation;
};

export type ChartRef = { kind: "chart"; key: ChartKey } | { kind: "push-fold"; key: PushFoldKey };

/** One Chart action and how often the hero's Combo takes it. */
export type ActionAdvice = { id: ActionId; name: ActionName; label: string; colour: ActionColour; frequency: number };

/** The main action, with its size in bb (`allIn` for pushes and all-in 3-bets). */
export type Verdict = { action: ActionAdvice; title: string; sizeBb: number | null; allIn: boolean };

export type PreflopAdvice =
  | {
      kind: "advice";
      chart: ChartRef;
      chartTitle: string;
      /** Link to the Chart in the Ranges tool (English path; see `localeHref`). */
      href: string;
      baseline: boolean;
      /** Every Chart action in Chart order, the remainder included. */
      actions: ActionAdvice[];
      verdict: Verdict;
      /** Plain sentence such as "AKo in CO, 15–20bb, folded to you". */
      context: string;
      /** Set when the Chart is a stand-in, e.g. below 15bb facing an open. */
      note: string | null;
    }
  | { kind: "walk"; reason: string }
  | { kind: "invalid"; reason: string };

const DEEPEST_PUSH_FOLD = PUSH_FOLD_DEPTHS[PUSH_FOLD_DEPTHS.length - 1];

/** Positions at the table that act before the hero preflop. */
export function positionsBefore(players: number, position: Position): Position[] {
  const atTable = tablePositions(players);
  const index = atTable.indexOf(position);
  return index < 0 ? [] : atTable.slice(0, index);
}

/** Limper groups the hero can face: one Position before them per limper. */
export function limperGroupsFor(players: number, position: Position): LimperGroup[] {
  const before = positionsBefore(players, position).length;
  return LIMPER_GROUPS.filter((group) => before >= (group === "1" ? 1 : 2));
}

function problem(question: PreflopQuestion, t: Messages["advisor"]): string | null {
  const { players, position, situation, depth } = question;
  if (!(depth > 0) || !Number.isFinite(depth)) return t.noStack;
  if (!tablePositions(players).includes(position)) return t.noPosition(position, players);
  const before = positionsBefore(players, position);
  if (situation.kind === "limps" && !limperGroupsFor(players, position).includes(situation.limpers)) {
    return situation.limpers === "1" ? t.nobodyBefore(position) : t.fewerThanTwo(position);
  }
  if (situation.kind === "open" || situation.kind === "push") {
    const by = situation.kind === "open" ? situation.opener : situation.pusher;
    if (by === "BB" || !before.includes(by)) return situation.kind === "open" ? t.openerFirst : t.pusherFirst;
  }
  return null;
}

const pushFoldDepth = (depth: number) => Math.min(DEEPEST_PUSH_FOLD, Math.max(1, Math.round(depth))) as PushFoldDepth;

function resolveChart(question: PreflopQuestion, t: Messages["advisor"]): { chart: ChartRef; note: string | null } {
  const { position, situation, depth } = question;
  const tier = stackTierFor(depth);
  if (situation.kind === "push") {
    const pusher = openerGroupOf(situation.pusher) ?? "late";
    const note = depth > DEEPEST_PUSH_FOLD + 0.5 ? t.vsPushCapped(DEEPEST_PUSH_FOLD) : null;
    return { chart: { key: { depth: pushFoldDepth(depth), position, pusher, situation: "vs-push" }, kind: "push-fold" }, note };
  }
  if (situation.kind === "folded" && tier === "push-fold") {
    return { chart: { key: { depth: pushFoldDepth(depth), position, situation: "push" }, kind: "push-fold" }, note: null };
  }
  const chartTier: StackTier = tier === "push-fold" ? "15-20bb" : tier;
  const note = tier === "push-fold" ? t.belowPushFold : null;
  if (situation.kind === "folded") return { chart: { key: { position, situation: "open", tier: chartTier }, kind: "chart" }, note };
  if (situation.kind === "open") {
    const opener = openerGroupOf(situation.opener) ?? "late";
    return { chart: { key: { opener, position, situation: "vs-open", tier: chartTier }, kind: "chart" }, note };
  }
  return { chart: { key: { limpers: situation.limpers, position, situation: "vs-limpers", tier: chartTier }, kind: "chart" }, note };
}

const fromBlinds = (position: Position) => position === "SB" || position === "BB";

/** Raise sizes: opens from the tier; 3-bets 3× in position, 4× from the blinds; iso-raises 3bb + 1bb per limper (+1bb from the blinds). */
function verdictFor(chart: ChartRef, action: ActionAdvice, t: Messages): Verdict {
  const plain = (title: string): Verdict => ({ action, allIn: false, sizeBb: null, title });
  const raiseTo = (title: string, sizeBb: number): Verdict => ({ action, allIn: false, sizeBb, title });
  const allIn = (title: string): Verdict => ({ action, allIn: true, sizeBb: null, title });
  if (action.id === "push") return allIn(t.actions.push);
  if (chart.kind === "push-fold") return action.id === "call" ? allIn(t.actions.call) : plain(action.label);
  const { key } = chart;
  if (action.id !== "raise") return plain(action.label);
  if (key.situation === "open") return raiseTo(action.label, OPEN_SIZE_BB[key.tier]);
  if (key.situation === "vs-open") return key.tier === "40bb+" ? raiseTo(action.label, OPEN_SIZE_BB[key.tier] * (fromBlinds(key.position) ? 4 : 3)) : allIn(action.label);
  if (key.tier === "15-20bb") return allIn(action.label);
  return raiseTo(action.label, 3 + (key.limpers === "1" ? 1 : 2) + (fromBlinds(key.position) ? 1 : 0));
}

/** "to 2.5bb", "to 2.5bb (500 chips)" with the big blind in chips, "all-in", or null when the action has no size. */
export function verdictSize(verdict: Verdict, locale: Locale, bigBlind?: number): string | null {
  const t = messages(locale).advisor;
  if (verdict.allIn) return t.allIn;
  if (verdict.sizeBb === null) return null;
  return t.raiseTo(verdict.sizeBb, bigBlind ? Math.round(verdict.sizeBb * bigBlind) : null);
}

function situationText(situation: PreflopSituation, t: Messages["advisor"]): string {
  if (situation.kind === "folded") return t.foldedToYou;
  if (situation.kind === "limps") return t.limpersBefore(situation.limpers);
  if (situation.kind === "open") return t.openedBy(situation.opener);
  return t.pushedBy(situation.pusher);
}

/** The Chart's answer for the hero's hand: frequencies, a verdict with its size, and a sentence of context. */
export function advisePreflop(question: PreflopQuestion, locale: Locale): PreflopAdvice {
  const t = messages(locale);
  const reason = problem(question, t.advisor);
  if (reason) return { kind: "invalid", reason };
  if (question.situation.kind === "folded" && question.position === "BB") return { kind: "walk", reason: t.advisor.walkReason };

  const { chart, note } = resolveChart(question, t.advisor);
  const combo = comboId(question.hand[0], question.hand[1]);
  const built = chart.kind === "chart" ? getChart(chart.key) : getPushFoldChart(chart.key);
  const actions = built.actions.map(({ id, name, colour, range }): ActionAdvice => ({ colour, frequency: range[combo], id, label: t.actions[name], name }));
  const main = actions.reduce((best, action) => (action.frequency > best.frequency ? action : best));

  const tier = stackTierFor(question.depth);
  const depthLabel = chart.kind === "push-fold" || tier === "push-fold" ? formatBb(chart.kind === "push-fold" ? chart.key.depth : question.depth, locale) : STACK_TIER_LABELS[tier];
  return {
    actions,
    baseline: chart.kind === "chart" && getChart(chart.key).baseline,
    chart,
    chartTitle: chart.kind === "chart" ? describeChart(chart.key, locale) : describePushFold(chart.key, locale),
    context: t.advisor.context(HAND_CLASS_NAMES[handClassOfCombo(combo)], question.position, depthLabel, situationText(question.situation, t.advisor)),
    href: chart.kind === "chart" ? chartHref(chart.key) : pushFoldHref(chart.key),
    kind: "advice",
    note,
    verdict: verdictFor(chart, main, t),
  };
}
