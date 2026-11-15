import { validateChart } from "@/lib/poker/chart-validation";
import { COMBO_COUNT } from "@/lib/poker/combo";
import { createRange, type Range } from "@/lib/poker/range";
import type { Position, StackTier } from "@/lib/poker/table";
import { type ActionId, type ChartAction, type ChartKey, chartActions, chartKeys, type LimperGroup, type OpenerGroup } from "./model";

type Raise = { raise: string };
type RaiseLimp = { raise: string; limp: string };
type RaiseCall = { raise: string; call: string };

/**
 * One Chart group: range strings per Stack tier and Position (fold is the implicit remainder).
 * `baseline` marks seeded starting points that have not yet been tuned.
 */
type ChartFile<Tier> = { baseline: boolean; tiers: Record<StackTier, Tier> };

export type OpenChartFile = ChartFile<Record<"UTG" | "UTG+1" | "LJ" | "HJ" | "CO" | "BTN", Raise> & { SB: RaiseLimp }>;

export type VsOpenChartFile = ChartFile<{
  early: Record<"UTG+1" | "LJ" | "HJ" | "CO" | "BTN" | "SB" | "BB", RaiseCall>;
  middle: Record<"HJ" | "CO" | "BTN" | "SB" | "BB", RaiseCall>;
  late: Record<"BTN" | "SB" | "BB", RaiseCall>;
}>;

/** The BB only raises behind limpers; checking is its remainder. */
export type VsLimpersChartFile = ChartFile<{
  "1": Record<"UTG+1" | "LJ" | "HJ" | "CO" | "BTN" | "SB", RaiseLimp> & { BB: Raise };
  "2+": Record<"LJ" | "HJ" | "CO" | "BTN" | "SB", RaiseLimp> & { BB: Raise };
}>;

export type ChartFiles = { open: OpenChartFile; "vs-open": VsOpenChartFile; "vs-limpers": VsLimpersChartFile };

/** Range strings keyed by written action. */
export type ChartEntry = Readonly<Partial<Record<ActionId, string>>>;

export type ActionRange = ChartAction & { range: Range };

/** The UI names it with `describeChart` (`lib/i18n/charts.ts`). */
export type Chart = { key: ChartKey; baseline: boolean; actions: ActionRange[] };

type Lookup = Partial<Record<string, Partial<Record<Position, ChartEntry>>>>;

export function chartEntry(files: ChartFiles, key: ChartKey): ChartEntry | undefined {
  const tier = files[key.situation].tiers[key.tier] as Lookup & Partial<Record<Position, ChartEntry>>;
  if (key.situation === "open") return tier[key.position];
  const group: OpenerGroup | LimperGroup = key.situation === "vs-open" ? key.opener : key.limpers;
  return tier[group]?.[key.position];
}

/** Problems with one Chart entry, each prefixed by where it lives (in English: they are for whoever edits the files). */
export function chartEntryErrors(key: ChartKey, entry: ChartEntry | undefined, expected: readonly ChartAction[] = chartActions(key), title = chartFileLocation(key)): string[] {
  return entryErrors(title, entry, expected);
}

/** Problems with an entry that should list the written (non-remainder) `expected` actions, each prefixed by `title`. */
export function entryErrors(title: string, entry: ChartEntry | undefined, expected: readonly ChartAction[]): string[] {
  if (!entry) return [`${title}: missing Chart`];
  const allowed = expected.filter((action) => !action.remainder).map((action) => action.id as string);
  const unexpected = Object.keys(entry).filter((id) => !allowed.includes(id));
  if (unexpected.length > 0) return unexpected.map((id) => `${title}: unexpected action "${id}"`);
  const missing = allowed.filter((id) => entry[id as ActionId] === undefined);
  if (missing.length > 0) return missing.map((id) => `${title}: missing action "${id}"`);
  const result = validateChart(Object.fromEntries(allowed.map((id) => [id, entry[id as ActionId] ?? ""])));
  return result.ok ? [] : result.errors.map((error) => `${title}: ${error}`);
}

/** Every problem across the Chart files: missing Charts, unknown actions, bad range strings, overlaps, sums above 1. */
export function validateChartFiles(files: ChartFiles): string[] {
  return chartKeys().flatMap((key) => chartEntryErrors(key, chartEntry(files, key)));
}

/**
 * Parses a Chart entry into one Range per action, including the implicit remainder.
 * Throws on an invalid entry; `actions` defaults to the Chart's standard actions.
 */
export function buildChart(key: ChartKey, entry: ChartEntry | undefined, baseline: boolean, actions: readonly ChartAction[] = chartActions(key)): Chart {
  return { actions: actionRanges(chartFileLocation(key), entry, actions), baseline, key };
}

/** One Range per action of a valid entry, the remainder included. Throws with every problem, each prefixed by `title`. */
export function actionRanges(title: string, entry: ChartEntry | undefined, actions: readonly ChartAction[]): ActionRange[] {
  const errors = entryErrors(title, entry, actions);
  if (errors.length > 0 || !entry) throw new Error(errors.join("\n"));
  const written = actions.filter((action) => !action.remainder);
  const result = validateChart(Object.fromEntries(written.map((action) => [action.id, entry[action.id] ?? ""])));
  if (!result.ok) throw new Error(result.errors.join("\n"));

  const remainder = createRange();
  for (let combo = 0; combo < COMBO_COUNT; combo++) {
    const played = written.reduce((sum, action) => sum + result.ranges[action.id][combo], 0);
    // Round away float noise so a fully played Combo leaves exactly nothing.
    remainder[combo] = Math.max(0, Math.round((1 - played) * 1e9) / 1e9);
  }
  return actions.map((action) => ({ ...action, range: action.remainder ? remainder : result.ranges[action.id] }));
}

const property = (name: string) => (/^[A-Za-z_]\w*$/.test(name) ? `.${name}` : `[${JSON.stringify(name)}]`);

/** Where a Chart lives in the repo, e.g. `content/charts/open.ts, tiers["40bb+"].CO`. */
export function chartFileLocation(key: ChartKey): string {
  const group = key.situation === "vs-open" ? property(key.opener) : key.situation === "vs-limpers" ? property(key.limpers) : "";
  return `content/charts/${key.situation}.ts, tiers${property(key.tier)}${group}${property(key.position)}`;
}
