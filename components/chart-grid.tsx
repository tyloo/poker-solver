"use client";

import { RangeGrid } from "@/components/range-grid";
import type { Chart } from "@/lib/charts/chart-files";
import type { ActionColour } from "@/lib/charts/model";
import { formatPercent } from "@/lib/format";
import { COMBO_COUNT, HAND_CLASS_NAMES, type HandClassId, handClassCombos } from "@/lib/poker/combo";
import { handClassWeights, type Range } from "@/lib/poker/range";

export const actionColor = (colour: ActionColour) => `var(--color-${colour})`;

/** Share of all 1326 Combos in a Range, e.g. "11.6%". */
export const rangeShare = (range: Range) => `${((range.reduce((sum, weight) => sum + weight, 0) / COMBO_COUNT) * 100).toFixed(1)}%`;

/** Action frequencies of one Hand class, largest first, e.g. "Raise 70%, Fold 30%". */
export function classFrequencies(actions: readonly { label: string; weights: Float64Array }[], cls: HandClassId): string {
  return actions
    .filter((action) => action.weights[cls] > 0)
    .sort((a, b) => b.weights[cls] - a.weights[cls])
    .map((action) => `${action.label} ${formatPercent(action.weights[cls])}`)
    .join(", ");
}

/** A Chart on the 13×13 grid: each Hand class is split by its Action frequencies. */
export function ChartGrid({ chart, selected, onSelect }: { chart: Chart; selected?: HandClassId | null; onSelect?: (cls: HandClassId) => void }) {
  const actions = chart.actions.map((action) => ({ ...action, weights: handClassWeights(action.range) }));
  return (
    <RangeGrid
      label={`${chart.title} chart`}
      segments={(cls) => actions.filter((action) => action.colour !== "fold").map((action) => ({ color: actionColor(action.colour), share: action.weights[cls] }))}
      describe={(cls) => `${HAND_CLASS_NAMES[cls]}: ${classFrequencies(actions, cls)}`}
      selected={selected}
      onSelect={onSelect}
    />
  );
}

/** Key to the grid colours, with each action's share of all hands. */
export function ActionLegend({ actions }: { actions: readonly { id: string; label: string; colour: ActionColour; range: Range }[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0">
      {actions.map((action) => (
        <li key={action.id} className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3.5 rounded-[3px] border border-dust/40" style={{ background: actionColor(action.colour) }} />
          <span>
            {action.label} <span className="text-dust">{rangeShare(action.range)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "AJo, 12 combos: Raise 70%, Fold 30%". */
export function classSummary(chart: Chart, cls: HandClassId): string {
  const actions = chart.actions.map((action) => ({ label: action.label, weights: handClassWeights(action.range) }));
  return `${HAND_CLASS_NAMES[cls]}, ${handClassCombos(cls).length} combos: ${classFrequencies(actions, cls)}`;
}
