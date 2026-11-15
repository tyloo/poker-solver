import type { Position } from "@/lib/poker/table";
import { buildChart, type Chart, type ChartEntry, chartEntryErrors } from "./chart-files";
import { type ActionId, type ChartKey, chartActions, LIMPER_GROUPS, type LimperGroup, OPENER_GROUPS, type OpenerGroup } from "./model";

export const PLAYER_TYPES = ["tight", "standard", "loose"] as const;
export type PlayerType = (typeof PLAYER_TYPES)[number];

export const PLAYER_TYPE_LABELS: Record<PlayerType, string> = { loose: "Loose", standard: "Standard", tight: "Tight" };

/**
 * Preflop Ranges of a non-Standard Player type, used to estimate an opponent's Range from
 * the action they took. One Range set for every Stack tier; Vs open and Vs limpers depend only
 * on the opener or limper group. Behind limpers the BB uses `raise` and checks everything else.
 */
export type PlayerTypeFile = {
  open: Record<Exclude<Position, "BB">, { raise: string; limp?: string }>;
  "vs-open": Record<OpenerGroup, { raise: string; call: string }>;
  "vs-limpers": Record<LimperGroup, { raise: string; limp: string }>;
};

export function playerTypeEntry(file: PlayerTypeFile, key: ChartKey): ChartEntry | undefined {
  if (key.situation === "open") return key.position === "BB" ? undefined : file.open[key.position];
  if (key.situation === "vs-open") return file["vs-open"][key.opener];
  const entry = file["vs-limpers"][key.limpers];
  return key.position === "BB" ? { raise: entry.raise } : entry;
}

const actionsOf = (key: ChartKey, entry: ChartEntry) => chartActions(key, Object.keys(entry) as ActionId[]);

/** Problems in a Player type file, each prefixed by `label`. */
export function playerTypeErrors(label: string, file: PlayerTypeFile): string[] {
  // Any hero Position that can face each group will do: the entries do not depend on it.
  const keys: ChartKey[] = [
    ...(Object.keys(file.open) as Exclude<Position, "BB">[]).map((position): ChartKey => ({ position, situation: "open", tier: "40bb+" })),
    ...OPENER_GROUPS.map((opener): ChartKey => ({ opener, position: "BTN", situation: "vs-open", tier: "40bb+" })),
    ...LIMPER_GROUPS.map((limpers): ChartKey => ({ limpers, position: "BTN", situation: "vs-limpers", tier: "40bb+" })),
  ];
  return keys.flatMap((key) => {
    const entry = playerTypeEntry(file, key);
    const where = key.situation === "open" ? `${key.position} open` : key.situation === "vs-open" ? `vs ${key.opener} open` : `vs ${key.limpers} limpers`;
    return chartEntryErrors(key, entry, entry ? actionsOf(key, entry) : undefined, `${label} ${where}`);
  });
}

/** The Chart-shaped Ranges a non-Standard Player type plays in a Situation. */
export function buildPlayerTypeChart(file: PlayerTypeFile, key: ChartKey): Chart {
  const entry = playerTypeEntry(file, key);
  return buildChart(key, entry, false, entry ? actionsOf(key, entry) : chartActions(key));
}
