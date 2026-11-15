"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ActionLegend, ChartGrid, classSummary } from "@/components/chart-grid";
import { ChartPicker } from "@/components/chart-picker";
import { type Chart, chartFileLocation } from "@/lib/charts/chart-files";
import { getChart } from "@/lib/charts/charts";
import { type ActionId, type ChartSelection, chartKeyFor, parseChartParams, selectionParams } from "@/lib/charts/model";
import { draftStrings } from "@/lib/charts/scratchpad";
import type { HandClassId } from "@/lib/poker/combo";
import { handClassWeights } from "@/lib/poker/range";
import { OPEN_SIZE_BB } from "@/lib/poker/table";
import { setUrlParams } from "@/lib/url-state";
import { Scratchpad } from "./scratchpad";

const EDIT_PARAM = "edit";
/** Scratchpad range strings live in the URL under their action ids. */
const DRAFT_PARAMS = ["raise", "call", "limp"] as const satisfies readonly ActionId[];

const primaryButton =
  "h-12 rounded-full bg-chalk px-6 font-bold font-display text-night text-xl focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3";

function BaselineNote({ chart }: { chart: Chart }) {
  if (!chart.baseline) return null;
  return (
    <p className="m-0 rounded-2xl border-2 border-booth border-dashed px-4 py-3 text-dust">
      Baseline starting point, not yet tuned to your games. Adjust it in <code className="text-chalk text-sm">{chartFileLocation(chart.key)}</code>.
    </p>
  );
}

export function RangesTool() {
  const params = useSearchParams();
  const selection = parseChartParams(params);
  const key = chartKeyFor(selection);
  const chart = getChart(key);
  const [selected, setSelected] = useState<HandClassId | null>(null);

  if (params.get(EDIT_PARAM) === "1") {
    const strings = Object.fromEntries(DRAFT_PARAMS.map((id) => [id, params.get(id) ?? ""]));
    return (
      <Scratchpad
        chart={chart}
        initial={strings}
        onSync={(next) => setUrlParams(Object.fromEntries(DRAFT_PARAMS.map((id) => [id, next[id] || null])))}
        onDone={() => setUrlParams({ [EDIT_PARAM]: null, ...Object.fromEntries(DRAFT_PARAMS.map((id) => [id, null])) }, "push")}
      />
    );
  }

  const select = (next: ChartSelection) => setUrlParams(selectionParams(next));
  const startEditing = () => {
    const draft = Object.fromEntries(chart.actions.filter((action) => !action.remainder).map((action) => [action.id, handClassWeights(action.range)]));
    const strings = draftStrings(draft);
    setUrlParams({ [EDIT_PARAM]: "1", ...Object.fromEntries(DRAFT_PARAMS.map((id) => [id, strings[id] || null])) }, "push");
  };

  return (
    <div className="flex flex-col gap-6">
      <ChartPicker value={selection} onChange={select} />

      <section aria-labelledby="chart-title" className="flex flex-col gap-4">
        <div>
          <h2 id="chart-title" className="m-0 font-bold font-display text-3xl leading-none">
            {chart.title}
          </h2>
          {key.situation === "open" && <p className="mt-1 mb-0 text-dust">Raises to {OPEN_SIZE_BB[key.tier]}bb.</p>}
        </div>
        <ActionLegend actions={chart.actions} />
        <ChartGrid chart={chart} selected={selected} onSelect={(cls) => setSelected(cls === selected ? null : cls)} />
        <p aria-live="polite" className="m-0 min-h-[3em] text-dust">
          {selected === null ? "Tap a hand for its frequencies." : <span className="text-chalk">{classSummary(chart, selected)}</span>}
        </p>
        <BaselineNote chart={chart} />
        <div>
          <button type="button" onClick={startEditing} className={primaryButton}>
            Edit in scratchpad
          </button>
        </div>
      </section>
    </div>
  );
}
