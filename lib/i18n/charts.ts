import type { ChartKey } from "@/lib/charts/model";
import type { PushFoldKey, PushFoldSeries } from "@/lib/charts/push-fold";
import { formatList } from "@/lib/format";
import { STACK_TIER_LABELS } from "@/lib/poker/table";
import type { Locale } from "./locale";
import { messages } from "./messages";

/** A Chart's Situation without its Stack tier: "BB vs late open". */
export function describeSituation(key: ChartKey, locale: Locale): string {
  const t = messages(locale).charts;
  if (key.situation === "open") return t.open(key.position);
  if (key.situation === "vs-open") return t.vsOpen(key.position, key.opener);
  return t.vsLimpers(key.position, key.limpers);
}

/** Plain-words name such as "BB vs late open, 25bb". */
export const describeChart = (key: ChartKey, locale: Locale): string => messages(locale).charts.withTier(describeSituation(key, locale), STACK_TIER_LABELS[key.tier]);

/** "CO push", or with a depth "BB vs late push, 8bb". */
export function describePushFold(series: PushFoldSeries | PushFoldKey, locale: Locale): string {
  const t = messages(locale).charts;
  const name = series.situation === "push" ? t.push(series.position) : t.vsPush(series.position, series.pusher);
  return "depth" in series ? t.atDepth(name, series.depth) : name;
}

/** Depth spans from `playedSpans`: "1–2bb and 5–7bb", or "" if none. */
export const spansText = (spans: readonly (readonly [number, number])[], locale: Locale): string =>
  formatList(
    spans.map(([from, to]) => messages(locale).charts.span(from, to)),
    locale,
  );
