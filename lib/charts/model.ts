import { POSITIONS, type Position, STACK_TIER_LABELS, STACK_TIERS, type StackTier } from "@/lib/poker/table";

/** Situations with raising Charts. Push and Vs push have their own Push/fold charts. */
export const SITUATIONS = ["open", "vs-open", "vs-limpers"] as const;
export type Situation = (typeof SITUATIONS)[number];

export const SITUATION_LABELS: Record<Situation, string> = { open: "Open", "vs-limpers": "Vs limpers", "vs-open": "Vs open" };

export const OPENER_GROUPS = ["early", "middle", "late"] as const;
export type OpenerGroup = (typeof OPENER_GROUPS)[number];

export const OPENER_GROUP_POSITIONS: Record<OpenerGroup, readonly Position[]> = { early: ["UTG", "UTG+1"], late: ["CO", "BTN", "SB"], middle: ["LJ", "HJ"] };

export const LIMPER_GROUPS = ["1", "2+"] as const;
export type LimperGroup = (typeof LIMPER_GROUPS)[number];

export type ChartKey =
  | { situation: "open"; tier: StackTier; position: Position }
  | { situation: "vs-open"; tier: StackTier; position: Position; opener: OpenerGroup }
  | { situation: "vs-limpers"; tier: StackTier; position: Position; limpers: LimperGroup };

/** Every picker value at once, so switching Situation keeps the other choices. */
export type ChartSelection = { situation: Situation; tier: StackTier; position: Position; opener: OpenerGroup; limpers: LimperGroup };

export function openerGroupOf(position: Position): OpenerGroup | null {
  return OPENER_GROUPS.find((group) => OPENER_GROUP_POSITIONS[group].includes(position)) ?? null;
}

const seat = (position: Position) => POSITIONS.indexOf(position);

/** Positions the hero can hold in a Situation; with a group, only those that can face it. */
export function heroPositions(situation: Situation, group?: OpenerGroup | LimperGroup): Position[] {
  if (situation === "open") return POSITIONS.filter((position) => position !== "BB");
  // The hero acts after the earliest opener of the group, or after at least one or two limpers.
  const first = situation === "vs-open" ? seat(OPENER_GROUP_POSITIONS[(group as OpenerGroup | undefined) ?? "early"][0]) : group === "2+" ? 1 : 0;
  return POSITIONS.filter((position) => seat(position) > first);
}

export function groupAvailable(situation: Situation, position: Position, group: OpenerGroup | LimperGroup): boolean {
  return heroPositions(situation, group).includes(position);
}

function nearest<T>(options: readonly T[], all: readonly T[], value: T): T {
  if (options.includes(value)) return value;
  const index = all.indexOf(value);
  return options.reduce((best, option) => (Math.abs(all.indexOf(option) - index) < Math.abs(all.indexOf(best) - index) ? option : best));
}

/** The Chart a picker selection points at, moving impossible Positions and groups to the nearest valid ones. */
export function chartKeyFor({ situation, tier, position, opener, limpers }: ChartSelection): ChartKey {
  const hero = nearest(heroPositions(situation), POSITIONS, position);
  if (situation === "open") return { position: hero, situation, tier };
  if (situation === "vs-open") {
    const groups = OPENER_GROUPS.filter((group) => groupAvailable(situation, hero, group));
    return { opener: nearest(groups, OPENER_GROUPS, opener), position: hero, situation, tier };
  }
  const groups = LIMPER_GROUPS.filter((group) => groupAvailable(situation, hero, group));
  return { limpers: nearest(groups, LIMPER_GROUPS, limpers), position: hero, situation, tier };
}

/** Every Chart the app expects, in browsing order. */
export function chartKeys(): ChartKey[] {
  return STACK_TIERS.flatMap((tier) => [
    ...heroPositions("open").map((position): ChartKey => ({ position, situation: "open", tier })),
    ...OPENER_GROUPS.flatMap((opener) => heroPositions("vs-open", opener).map((position): ChartKey => ({ opener, position, situation: "vs-open", tier }))),
    ...LIMPER_GROUPS.flatMap((limpers) => heroPositions("vs-limpers", limpers).map((position): ChartKey => ({ limpers, position, situation: "vs-limpers", tier }))),
  ]);
}

export type ActionId = "raise" | "call" | "limp" | "check" | "push" | "fold";
export type ActionColour = "raise" | "call" | "push" | "fold";

/** One action of a Chart. The remainder action (fold, or check for the BB behind limpers) is implicit in Chart files. */
export type ChartAction = { id: ActionId; label: string; colour: ActionColour; remainder: boolean };

export const action = (id: ActionId, label: string, colour: ActionColour, remainder = false): ChartAction => ({ colour, id, label, remainder });

/** The written actions of a Chart (as keyed in Chart files) followed by its implicit remainder. */
export function chartActions(key: ChartKey, written?: readonly ActionId[]): ChartAction[] {
  const fold = action("fold", "Fold", "fold", true);
  const has = (id: ActionId, standard: boolean) => (written ? written.includes(id) : standard);
  if (key.situation === "open") return [action("raise", "Raise", "raise"), ...(has("limp", key.position === "SB") ? [action("limp", "Limp", "call")] : []), fold];
  if (key.situation === "vs-open") return [action("raise", "3-bet", "raise"), action("call", "Call", "call"), fold];
  if (key.position === "BB") return [action("raise", "Raise", "raise"), action("check", "Check", "call", true)];
  return [action("raise", "Iso-raise", "raise"), action("limp", "Overlimp", "call"), fold];
}

/** Plain-words name such as "BB vs late open, 25bb". */
export function describeChart(key: ChartKey): string {
  const tier = STACK_TIER_LABELS[key.tier];
  if (key.situation === "open") return `${key.position} open, ${tier}`;
  if (key.situation === "vs-open") return `${key.position} vs ${key.opener} open, ${tier}`;
  return `${key.position} vs ${key.limpers === "1" ? "1 limper" : "2+ limpers"}, ${tier}`;
}

/** Query-string names and defaults shared by the Ranges tool and links into it. */
export const CHART_PARAMS = { limpers: "limpers", opener: "opener", position: "pos", situation: "sit", tier: "tier" } as const;

export const DEFAULT_SELECTION: ChartSelection = { limpers: "1", opener: "early", position: "BTN", situation: "open", tier: "40bb+" };

const pick = <T extends string>(values: readonly T[], raw: string | null, fallback: T): T => (values.includes(raw as T) ? (raw as T) : fallback);

export function parseChartParams(params: URLSearchParams): ChartSelection {
  const read = (name: keyof ChartSelection) => params.get(CHART_PARAMS[name]);
  return {
    limpers: pick(LIMPER_GROUPS, read("limpers"), DEFAULT_SELECTION.limpers),
    opener: pick(OPENER_GROUPS, read("opener"), DEFAULT_SELECTION.opener),
    position: pick(POSITIONS, read("position"), DEFAULT_SELECTION.position),
    situation: pick(SITUATIONS, read("situation"), DEFAULT_SELECTION.situation),
    tier: pick(STACK_TIERS, read("tier"), DEFAULT_SELECTION.tier),
  };
}

/** Query params for every picker value; defaults are `null` so they drop out of the URL. */
export function selectionParams(selection: ChartSelection): Record<string, string | null> {
  return Object.fromEntries(
    (Object.keys(CHART_PARAMS) as (keyof ChartSelection)[]).map((name) => [CHART_PARAMS[name], selection[name] === DEFAULT_SELECTION[name] ? null : selection[name]]),
  );
}

/** Link to a Chart in the Ranges tool. */
export function chartHref(key: ChartKey): string {
  const selection: ChartSelection = { ...DEFAULT_SELECTION, ...key };
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(selectionParams(selection))) if (value !== null) params.set(name, value);
  const query = params.toString();
  return query ? `/ranges?${query}` : "/ranges";
}
