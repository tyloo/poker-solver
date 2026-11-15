"use client";

import { useState } from "react";
import { ChartGrid } from "@/components/chart-grid";
import { ChartPicker } from "@/components/chart-picker";
import { Sheet } from "@/components/sheet";
import { playerTypeChart } from "@/lib/charts/charts";
import { type ChartSelection, chartKeyFor, DEFAULT_SELECTION } from "@/lib/charts/model";
import type { PlayerType } from "@/lib/charts/player-types";
import { describeChart, describeSituation } from "@/lib/i18n/charts";
import { type Range, rangeShare } from "@/lib/poker/range";
import { textButton } from "./buttons";
import { useI18n } from "./i18n-provider";

const SOURCES = ["standard", "tight", "loose"] as const satisfies readonly PlayerType[];

type LoadProps = {
  /** Receives a copy of the chosen Range and a name for it, e.g. "CO open, 40bb+: Raise". */
  onLoad: (range: Range, label: string) => void;
  onClose: () => void;
  initial?: ChartSelection;
};

/** Picks one action's Range from a Chart or a Player type. Render it only while open. */
export function LoadRangeSheet({ onLoad, onClose, initial = DEFAULT_SELECTION }: LoadProps) {
  const { locale, t } = useI18n();
  const [source, setSource] = useState<PlayerType>("standard");
  const [selection, setSelection] = useState(initial);
  const key = chartKeyFor(selection);
  const chart = playerTypeChart(source, key);
  // Player types have one Range set for every Stack tier, so their name drops the tier.
  const name = source === "standard" ? describeChart(key, locale) : t.load.typeChart(t.charts.playerTypes[source], describeSituation(key, locale));

  return (
    <Sheet title={t.load.title} onClose={onClose}>
      <fieldset className="m-0 mb-4 min-w-0 border-0 p-0">
        <legend className="mb-1.5 p-0 text-dust">{t.load.from}</legend>
        <div className="flex gap-1">
          {SOURCES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === source}
              onClick={() => setSource(option)}
              className="h-11 flex-1 rounded-xl bg-night px-1 font-bold font-display text-lg leading-none focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2 aria-pressed:bg-chalk aria-pressed:text-night"
            >
              {option === "standard" ? t.load.charts : t.charts.playerTypes[option]}
            </button>
          ))}
        </div>
        <p className="mt-1.5 mb-0 text-dust text-sm">{source === "standard" ? t.load.standardNote : t.load.typeNote}</p>
      </fieldset>

      <ChartPicker value={selection} onChange={setSelection} showTier={source === "standard"} />

      <div className="mt-5">
        <ChartGrid chart={chart} />
      </div>

      <p className="mt-4 mb-2 font-bold">{t.load.pickAction}</p>
      <div className="flex flex-col gap-2">
        {chart.actions
          .filter((action) => action.id !== "fold")
          .map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                onLoad(action.range.slice(), t.load.loaded(name, t.actions[action.name]));
                onClose();
              }}
              className="flex h-12 items-center justify-between rounded-xl bg-night px-4 text-left font-bold hover:text-chalk focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2"
            >
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="size-3.5 rounded-[3px]" style={{ background: `var(--color-${action.colour})` }} />
                {t.actions[action.name]}
              </span>
              <span className="font-normal text-dust">{t.common.ofHands(rangeShare(action.range))}</span>
            </button>
          ))}
      </div>
    </Sheet>
  );
}

/** A "Load" button that opens the Load sheet; fits the Equity Range editor's load slot. */
export function LoadRangeButton({ onLoad, initial }: { onLoad: (range: Range, label: string) => void; initial?: ChartSelection }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={textButton}>
        {t.common.load}
      </button>
      {open && <LoadRangeSheet onLoad={onLoad} onClose={() => setOpen(false)} initial={initial} />}
    </>
  );
}
