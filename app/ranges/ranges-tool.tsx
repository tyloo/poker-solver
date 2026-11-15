"use client";

import { useSearchParams } from "next/navigation";
import { primaryButton } from "@/components/buttons";
import { ActionLegend, ChartGrid, classSummary } from "@/components/chart-grid";
import { ChartPicker } from "@/components/chart-picker";
import { useI18n } from "@/components/i18n-provider";
import { type Chart, chartFileLocation } from "@/lib/charts/chart-files";
import { getChart } from "@/lib/charts/charts";
import { type ActionId, type ChartSelection, chartKeyFor } from "@/lib/charts/model";
import { type BrowseSelection, browseParams, browseSeries, isPushFoldSituation, parseBrowseParams } from "@/lib/charts/push-fold";
import { draftStrings } from "@/lib/charts/scratchpad";
import { describeChart } from "@/lib/i18n/charts";
import { handClassWeights } from "@/lib/poker/range";
import { OPEN_SIZE_BB } from "@/lib/poker/table";
import { codecs, HAND_CLASS_PARAM, setUrlParams, useUrlState } from "@/lib/url-state";
import { PushFoldView } from "./push-fold-view";
import { Scratchpad } from "./scratchpad";

const EDIT_PARAM = "edit";
/** Scratchpad range strings live in the URL under their action ids. */
const DRAFT_PARAMS = ["raise", "call", "limp"] as const satisfies readonly ActionId[];

function BaselineNote({ chart }: { chart: Chart }) {
  const { baseline } = useI18n().t.ranges;
  if (!chart.baseline) return null;
  return (
    <p className="m-0 rounded-2xl border-2 border-booth border-dashed px-4 py-3 text-dust">
      {baseline.before}
      <code className="text-chalk text-sm">{chartFileLocation(chart.key)}</code>
      {baseline.after}
    </p>
  );
}

export function RangesTool() {
  const params = useSearchParams();
  const browsing = parseBrowseParams(params);
  const select = (next: BrowseSelection) => setUrlParams(browseParams(next));
  const { situation } = browsing;
  if (isPushFoldSituation(situation)) {
    return (
      <div className="flex flex-col gap-6">
        <ChartPicker pushFold value={browsing} onChange={select} />
        <PushFoldView series={browseSeries({ ...browsing, situation })} />
      </div>
    );
  }
  return <ChartView selection={{ ...browsing, situation }} select={select} />;
}

function ChartView({ selection, select }: { selection: ChartSelection; select: (next: BrowseSelection) => void }) {
  const { locale, t } = useI18n();
  const params = useSearchParams();
  const key = chartKeyFor(selection);
  const chart = getChart(key);
  const [selected, setSelected] = useUrlState(HAND_CLASS_PARAM, codecs.handClass(null));

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

  const startEditing = () => {
    const draft = Object.fromEntries(chart.actions.filter((action) => !action.remainder).map((action) => [action.id, handClassWeights(action.range)]));
    const strings = draftStrings(draft);
    setUrlParams({ [EDIT_PARAM]: "1", ...Object.fromEntries(DRAFT_PARAMS.map((id) => [id, strings[id] || null])) }, "push");
  };

  return (
    <div className="flex flex-col gap-6">
      <ChartPicker pushFold value={selection} onChange={select} />

      <section aria-labelledby="chart-title" className="flex flex-col gap-4">
        <div>
          <h2 id="chart-title" className="m-0 font-bold font-display text-3xl leading-none">
            {describeChart(key, locale)}
          </h2>
          {key.situation === "open" && <p className="mt-1 mb-0 text-dust">{t.ranges.raisesTo(OPEN_SIZE_BB[key.tier])}</p>}
        </div>
        <ActionLegend actions={chart.actions} />
        <ChartGrid chart={chart} selected={selected} onSelect={(cls) => setSelected(cls === selected ? null : cls)} />
        <p aria-live="polite" className="m-0 min-h-[3em] text-dust">
          {selected === null ? t.ranges.tapHand : <span className="text-chalk">{classSummary(chart, selected, locale)}</span>}
        </p>
        <BaselineNote chart={chart} />
        <div>
          <button type="button" onClick={startEditing} className={primaryButton}>
            {t.ranges.edit}
          </button>
        </div>
      </section>
    </div>
  );
}
