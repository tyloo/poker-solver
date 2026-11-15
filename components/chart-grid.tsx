"use client";

import { RangeGrid } from "@/components/range-grid";
import type { Chart } from "@/lib/charts/chart-files";
import type { ActionColour, ActionName } from "@/lib/charts/model";
import { formatPercent } from "@/lib/format";
import { describeChart } from "@/lib/i18n/charts";
import type { Locale } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";
import { HAND_CLASS_NAMES, type HandClassId, handClassCombos } from "@/lib/poker/combo";
import { handClassWeights, type Range, rangeShare } from "@/lib/poker/range";
import { useI18n } from "./i18n-provider";

export const actionColor = (colour: ActionColour) => `var(--color-${colour})`;

/** Action frequencies of one Hand class, largest first, e.g. "Raise 70%, Fold 30%". */
export function classFrequencies(actions: readonly { label: string; weights: Float64Array }[], cls: HandClassId, locale: Locale): string {
  return actions
    .filter((action) => action.weights[cls] > 0)
    .sort((a, b) => b.weights[cls] - a.weights[cls])
    .map((action) => `${action.label} ${formatPercent(action.weights[cls], locale)}`)
    .join(", ");
}

/** A Chart on the 13×13 grid: each Hand class is split by its Action frequencies. */
export function ChartGrid({ chart, selected, onSelect }: { chart: Chart; selected?: HandClassId | null; onSelect?: (cls: HandClassId) => void }) {
  const { locale, t } = useI18n();
  const actions = chart.actions.map((action) => ({ ...action, label: t.actions[action.name], weights: handClassWeights(action.range) }));
  return (
    <RangeGrid
      label={t.grid.chart(describeChart(chart.key, locale))}
      segments={(cls) => actions.filter((action) => action.colour !== "fold").map((action) => ({ color: actionColor(action.colour), share: action.weights[cls] }))}
      describe={(cls) => `${HAND_CLASS_NAMES[cls]}: ${classFrequencies(actions, cls, locale)}`}
      selected={selected}
      onSelect={onSelect}
    />
  );
}

/** Key to the grid colours, with each action's share of all hands. */
export function ActionLegend({ actions }: { actions: readonly { id: string; name: ActionName; colour: ActionColour; range: Range }[] }) {
  const { t } = useI18n();
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0">
      {actions.map((action) => (
        <li key={action.id} className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3.5 rounded-[3px] border border-dust/40" style={{ background: actionColor(action.colour) }} />
          <span>
            {t.actions[action.name]} <span className="text-dust">{t.common.share(rangeShare(action.range))}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "AJo, 12 combos: Raise 70%, Fold 30%". */
export function classSummary(chart: Chart, cls: HandClassId, locale: Locale): string {
  const t = messages(locale);
  const actions = chart.actions.map((action) => ({ label: t.actions[action.name], weights: handClassWeights(action.range) }));
  return t.grid.classSummary(HAND_CLASS_NAMES[cls], handClassCombos(cls).length, classFrequencies(actions, cls, locale));
}
