import { OPEN_CHARTS } from "@/content/charts/open";
import { PUSH_CHARTS } from "@/content/charts/push";
import { VS_LIMPERS_CHARTS } from "@/content/charts/vs-limpers";
import { VS_OPEN_CHARTS } from "@/content/charts/vs-open";
import { VS_PUSH_CHARTS } from "@/content/charts/vs-push";
import { LOOSE } from "@/content/player-types/loose";
import { TIGHT } from "@/content/player-types/tight";
import { handClassWeights, type Range } from "@/lib/poker/range";
import { buildChart, type Chart, type ChartFiles, chartEntry, validateChartFiles } from "./chart-files";
import { type ActionId, type ChartKey, chartHref } from "./model";
import { buildPlayerTypeChart, type PlayerType, type PlayerTypeFile, playerTypeErrors } from "./player-types";
import {
  buildPushFoldChart,
  describePushFold,
  PUSH_FOLD_DEPTHS,
  type PushFoldChart,
  type PushFoldFiles,
  type PushFoldKey,
  type PushFoldSeries,
  pushFoldEntry,
  validatePushFoldFiles,
} from "./push-fold";

export const CHART_FILES: ChartFiles = { open: OPEN_CHARTS, "vs-limpers": VS_LIMPERS_CHARTS, "vs-open": VS_OPEN_CHARTS };

export const PUSH_FOLD_FILES: PushFoldFiles = { push: PUSH_CHARTS, "vs-push": VS_PUSH_CHARTS };

export const PLAYER_TYPE_FILES: Record<Exclude<PlayerType, "standard">, PlayerTypeFile> = { loose: LOOSE, tight: TIGHT };

/** Every problem in the repo Charts and Player type files. */
export function chartErrors(): string[] {
  return [...validateChartFiles(CHART_FILES), ...validatePushFoldFiles(PUSH_FOLD_FILES), ...playerTypeErrors("Tight", TIGHT), ...playerTypeErrors("Loose", LOOSE)];
}

/** Throws with every problem listed. Called while prerendering, so an invalid Chart file fails `next build`. */
export function assertChartsValid(): void {
  const errors = chartErrors();
  if (errors.length > 0) throw new Error(`Invalid Chart files:\n${errors.join("\n")}`);
}

const cache = new Map<string, Chart>();

function cached(id: string, build: () => Chart): Chart {
  let chart = cache.get(id);
  if (!chart) {
    chart = build();
    cache.set(id, chart);
  }
  return chart;
}

/** The repo Chart for a key from `chartKeys()`. */
export function getChart(key: ChartKey): Chart {
  return cached(chartHref(key), () => buildChart(key, chartEntry(CHART_FILES, key), CHART_FILES[key.situation].baseline));
}

/** How a Player type plays a Situation. Standard is the repo Chart itself. */
export function playerTypeChart(type: PlayerType, key: ChartKey): Chart {
  if (type === "standard") return getChart(key);
  return cached(`${type}:${chartHref(key)}`, () => buildPlayerTypeChart(PLAYER_TYPE_FILES[type], key));
}

/** Estimated Range of a player of `type` who took `action` in a Situation, or null if that type never takes it. */
export function estimateRange(type: PlayerType, key: ChartKey, action: ActionId): Range | null {
  return playerTypeChart(type, key).actions.find((entry) => entry.id === action)?.range ?? null;
}

const pushFoldCache = new Map<string, PushFoldChart>();

/** The repo Push/fold chart for a key from `pushFoldKeys()`. */
export function getPushFoldChart(key: PushFoldKey): PushFoldChart {
  const id = describePushFold(key, "en");
  let chart = pushFoldCache.get(id);
  if (!chart) {
    chart = buildPushFoldChart(key, pushFoldEntry(PUSH_FOLD_FILES, key));
    pushFoldCache.set(id, chart);
  }
  return chart;
}

/** Push (or call) frequency per Hand class at each depth of a series: `[depth - 1][HandClassId]`. */
export function pushFoldFrequencies(series: PushFoldSeries): Float64Array[] {
  return PUSH_FOLD_DEPTHS.map((depth) => handClassWeights(getPushFoldChart({ ...series, depth }).actions[0].range));
}
