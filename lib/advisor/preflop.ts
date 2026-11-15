import { getChart, getPushFoldChart } from "@/lib/charts/charts";
import { type ActionColour, type ActionId, type ActionName, type ChartKey, chartHref, LIMPER_GROUPS, type LimperGroup, openerGroupOf } from "@/lib/charts/model";
import { PUSH_FOLD_DEPTHS, type PushFoldDepth, type PushFoldKey, pushFoldHref } from "@/lib/charts/push-fold";
import type { CardId } from "@/lib/poker/card";
import { comboId, type HandClassId, handClassOfCombo } from "@/lib/poker/combo";
import { OPEN_SIZE_BB, type Position, type StackTier, stackTierFor, tablePositions } from "@/lib/poker/table";

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
export type ActionAdvice = { id: ActionId; name: ActionName; colour: ActionColour; frequency: number };

/** The main action, named `name`, with its size in bb (`allIn` for pushes and all-in 3-bets). */
export type Verdict = { action: ActionAdvice; name: ActionName; sizeBb: number | null; allIn: boolean };

/** Why the Advisor cannot answer the question. */
export type PreflopProblem =
  | { code: "no-stack" | "opener-first" | "pusher-first" }
  | { code: "no-position"; position: Position; players: number }
  | { code: "nobody-before" | "fewer-than-two"; position: Position };

/** Why the Chart used is a stand-in. */
export type ChartNote = { code: "vs-push-capped"; depth: number } | { code: "below-push-fold" };

/** What the answer is about, e.g. AKo in CO, 15–20bb, folded to you. `depth` is in bb on Push/fold charts and below 15bb. */
export type AdviceContext = { handClass: HandClassId; position: Position; depth: { bb: number } | { tier: StackTier }; situation: PreflopSituation };

export type PreflopAdvice =
  | {
      kind: "advice";
      chart: ChartRef;
      /** Link to the Chart in the Ranges tool (English path; see `localeHref`). */
      href: string;
      baseline: boolean;
      /** Every Chart action in Chart order, the remainder included. */
      actions: ActionAdvice[];
      verdict: Verdict;
      context: AdviceContext;
      /** Set when the Chart is a stand-in, e.g. below 15bb facing an open. */
      note: ChartNote | null;
    }
  | { kind: "walk" }
  | { kind: "invalid"; problem: PreflopProblem };

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

function problem(question: PreflopQuestion): PreflopProblem | null {
  const { players, position, situation, depth } = question;
  if (!(depth > 0) || !Number.isFinite(depth)) return { code: "no-stack" };
  if (!tablePositions(players).includes(position)) return { code: "no-position", players, position };
  const before = positionsBefore(players, position);
  if (situation.kind === "limps" && !limperGroupsFor(players, position).includes(situation.limpers)) {
    return { code: situation.limpers === "1" ? "nobody-before" : "fewer-than-two", position };
  }
  if (situation.kind === "open" || situation.kind === "push") {
    const by = situation.kind === "open" ? situation.opener : situation.pusher;
    if (by === "BB" || !before.includes(by)) return { code: situation.kind === "open" ? "opener-first" : "pusher-first" };
  }
  return null;
}

const pushFoldDepth = (depth: number) => Math.min(DEEPEST_PUSH_FOLD, Math.max(1, Math.round(depth))) as PushFoldDepth;

function resolveChart(question: PreflopQuestion): { chart: ChartRef; note: ChartNote | null } {
  const { position, situation, depth } = question;
  const tier = stackTierFor(depth);
  if (situation.kind === "push") {
    const pusher = openerGroupOf(situation.pusher) ?? "late";
    const note: ChartNote | null = depth > DEEPEST_PUSH_FOLD + 0.5 ? { code: "vs-push-capped", depth: DEEPEST_PUSH_FOLD } : null;
    return { chart: { key: { depth: pushFoldDepth(depth), position, pusher, situation: "vs-push" }, kind: "push-fold" }, note };
  }
  if (situation.kind === "folded" && tier === "push-fold") {
    return { chart: { key: { depth: pushFoldDepth(depth), position, situation: "push" }, kind: "push-fold" }, note: null };
  }
  const chartTier: StackTier = tier === "push-fold" ? "15-20bb" : tier;
  const note: ChartNote | null = tier === "push-fold" ? { code: "below-push-fold" } : null;
  if (situation.kind === "folded") return { chart: { key: { position, situation: "open", tier: chartTier }, kind: "chart" }, note };
  if (situation.kind === "open") {
    const opener = openerGroupOf(situation.opener) ?? "late";
    return { chart: { key: { opener, position, situation: "vs-open", tier: chartTier }, kind: "chart" }, note };
  }
  return { chart: { key: { limpers: situation.limpers, position, situation: "vs-limpers", tier: chartTier }, kind: "chart" }, note };
}

const fromBlinds = (position: Position) => position === "SB" || position === "BB";

/** Raise sizes: opens from the tier; 3-bets 3× in position, 4× from the blinds; iso-raises 3bb + 1bb per limper (+1bb from the blinds). */
function verdictFor(chart: ChartRef, action: ActionAdvice): Verdict {
  const plain = (name: ActionName): Verdict => ({ action, allIn: false, name, sizeBb: null });
  const raiseTo = (sizeBb: number): Verdict => ({ action, allIn: false, name: action.name, sizeBb });
  const allIn = (name: ActionName): Verdict => ({ action, allIn: true, name, sizeBb: null });
  if (action.id === "push") return allIn("push");
  if (chart.kind === "push-fold") return action.id === "call" ? allIn("call") : plain(action.name);
  const { key } = chart;
  if (action.id !== "raise") return plain(action.name);
  if (key.situation === "open") return raiseTo(OPEN_SIZE_BB[key.tier]);
  if (key.situation === "vs-open") return key.tier === "40bb+" ? raiseTo(OPEN_SIZE_BB[key.tier] * (fromBlinds(key.position) ? 4 : 3)) : allIn(action.name);
  if (key.tier === "15-20bb") return allIn(action.name);
  return raiseTo(3 + (key.limpers === "1" ? 1 : 2) + (fromBlinds(key.position) ? 1 : 0));
}

/** The Chart's answer for the hero's hand: frequencies, a verdict with its size, and its context. */
export function advisePreflop(question: PreflopQuestion): PreflopAdvice {
  const invalid = problem(question);
  if (invalid) return { kind: "invalid", problem: invalid };
  if (question.situation.kind === "folded" && question.position === "BB") return { kind: "walk" };

  const { chart, note } = resolveChart(question);
  const combo = comboId(question.hand[0], question.hand[1]);
  const built = chart.kind === "chart" ? getChart(chart.key) : getPushFoldChart(chart.key);
  const actions = built.actions.map(({ id, name, colour, range }): ActionAdvice => ({ colour, frequency: range[combo], id, name }));
  const main = actions.reduce((best, action) => (action.frequency > best.frequency ? action : best));

  const tier = stackTierFor(question.depth);
  const depth = chart.kind === "push-fold" ? { bb: chart.key.depth } : tier === "push-fold" ? { bb: question.depth } : { tier };
  return {
    actions,
    baseline: chart.kind === "chart" && getChart(chart.key).baseline,
    chart,
    context: { depth, handClass: handClassOfCombo(combo), position: question.position, situation: question.situation },
    href: chart.kind === "chart" ? chartHref(chart.key) : pushFoldHref(chart.key),
    kind: "advice",
    note,
    verdict: verdictFor(chart, main),
  };
}
