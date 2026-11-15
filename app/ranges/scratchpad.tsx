"use client";

import { useEffect, useRef, useState } from "react";
import { actionColor, classFrequencies } from "@/components/chart-grid";
import { HandGrid } from "@/components/hand-grid";
import { type Chart, chartFileLocation } from "@/lib/charts/chart-files";
import type { ActionId } from "@/lib/charts/model";
import { type Draft, draftFromStrings, draftSnippet, draftStrings, paintDraft } from "@/lib/charts/scratchpad";
import { COMBO_COUNT, HAND_CLASS_COUNT, HAND_CLASS_NAMES, type HandClassId, handClassCombos } from "@/lib/poker/combo";
import { handClassWeights } from "@/lib/poker/range";

type Props = {
  chart: Chart;
  /** Range strings from the URL, keyed by action id. */
  initial: Readonly<Partial<Record<ActionId, string>>>;
  /** Mirrors the edits into the URL. */
  onSync: (strings: Partial<Record<ActionId, string>>) => void;
  onDone: () => void;
};

const FREQUENCIES = [1, 0.75, 0.5, 0.25] as const;
const SYNC_DELAY_MS = 400;

const pill =
  "h-11 min-w-0 flex-1 rounded-xl bg-booth px-1 font-bold font-display text-lg leading-none focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2";
const textButton = "h-12 rounded-full px-4 font-bold text-dust underline decoration-2 underline-offset-4 hover:text-chalk focus-visible:outline-3 focus-visible:outline-chalk";
const primaryButton =
  "h-12 rounded-full bg-chalk px-6 font-bold font-display text-night text-xl focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3";

const share = (weights: Float64Array) => {
  let combos = 0;
  for (let cls = 0; cls < HAND_CLASS_COUNT; cls++) combos += weights[cls] * handClassCombos(cls).length;
  return `${((combos / COMBO_COUNT) * 100).toFixed(1)}%`;
};

/** Paints Action frequencies onto a copy of a Chart and offers the result as a Chart entry to paste. Nothing is saved. */
export function Scratchpad({ chart, initial, onSync, onDone }: Props) {
  const written = chart.actions.filter((action) => !action.remainder);
  const remainder = chart.actions.find((action) => action.remainder);
  const ids = written.map((action) => action.id);
  const fromChart = (): Draft => Object.fromEntries(written.map((action) => [action.id, handClassWeights(action.range)]));

  const [draft, setDraft] = useState<Draft>(() => draftFromStrings(ids, initial));
  const [brush, setBrush] = useState<ActionId>(ids[0]);
  const [frequency, setFrequency] = useState<number>(1);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const strokeRef = useRef<{ action: ActionId; frequency: number }>({ action: brush, frequency });
  const snippetRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => onSync(draftStrings(draft)), SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft]);

  const weightsOf = (id: ActionId) => draft[id] ?? new Float64Array(HAND_CLASS_COUNT);
  const remainderWeights = Float64Array.from({ length: HAND_CLASS_COUNT }, (_, cls) => Math.max(0, 1 - ids.reduce((sum, id) => sum + weightsOf(id)[cls], 0)));
  const rows = [...written.map((action) => ({ ...action, weights: weightsOf(action.id) })), ...(remainder ? [{ ...remainder, weights: remainderWeights }] : [])];

  const paint = (cls: HandClassId, start: boolean) => {
    if (start) {
      // Tapping a hand that already has the brush's frequency clears it instead.
      const clear = brush !== remainder?.id && weightsOf(brush)[cls] === frequency;
      strokeRef.current = clear && remainder ? { action: remainder.id, frequency: 1 } : { action: brush, frequency };
    }
    const { action, frequency: value } = strokeRef.current;
    setDraft((current) => paintDraft(current, cls, action, value));
    setCopied("idle");
  };

  const replace = (next: Draft) => {
    setDraft(next);
    setCopied("idle");
  };

  const snippet = draftSnippet(draft);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied("copied");
    } catch {
      snippetRef.current?.select();
      setCopied("failed");
    }
  };

  return (
    <section aria-labelledby="scratchpad-title" className="flex flex-col gap-5">
      <div>
        <h2 id="scratchpad-title" className="m-0 font-bold font-display text-3xl leading-none">
          Scratchpad
        </h2>
        <p className="mt-1 mb-0 text-dust">Started from {chart.title}. Nothing is saved: copy the range string into the Chart file.</p>
      </div>

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-1.5 p-0 text-dust">Paint</legend>
        <div className="flex gap-1">
          {rows.map((action) => (
            <button
              key={action.id}
              type="button"
              aria-pressed={brush === action.id}
              onClick={() => setBrush(action.id)}
              className={`${pill} flex items-center justify-center gap-2 aria-pressed:bg-chalk aria-pressed:text-night`}
            >
              <span aria-hidden="true" className="size-3 rounded-[3px] border border-dust/40" style={{ background: actionColor(action.colour) }} />
              {action.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-1.5 p-0 text-dust">Frequency</legend>
        <div className="flex gap-1">
          {FREQUENCIES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={frequency === value}
              onClick={() => setFrequency(value)}
              className={`${pill} aria-pressed:bg-chalk aria-pressed:text-night`}
            >
              {value * 100}%
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <HandGrid
          label="Scratchpad chart, tap or drag to paint"
          segments={(cls) => rows.filter((action) => action.colour !== "fold").map((action) => ({ color: actionColor(action.colour), share: action.weights[cls] }))}
          describe={(cls) => `${HAND_CLASS_NAMES[cls]}: ${classFrequencies(rows, cls)}`}
          onPaint={paint}
        />
        <ul className="mt-3 mb-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0">
          {rows.map((action) => (
            <li key={action.id}>
              {action.label} <span className="text-dust">{share(action.weights)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => replace(fromChart())} className={textButton}>
          Reset to chart
        </button>
        <button type="button" onClick={() => replace(draftFromStrings(ids, {}))} className={textButton}>
          Clear
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block font-bold">Range string</span>
        <textarea
          ref={snippetRef}
          readOnly
          value={snippet}
          rows={4}
          spellCheck={false}
          className="block w-full resize-none rounded-xl border-2 border-booth bg-booth px-3 py-2 font-mono text-chalk text-sm focus-visible:border-chalk focus-visible:outline-none"
        />
      </label>
      <p className="-mt-3 mb-0 text-dust text-sm">
        Paste over <code className="text-chalk">{chartFileLocation(chart.key)}</code>.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={copy} className={primaryButton}>
          Copy range string
        </button>
        <button type="button" onClick={onDone} className={textButton}>
          Done
        </button>
        <span aria-live="polite" className="text-dust">
          {copied === "copied" ? "Copied." : copied === "failed" ? "Copy blocked: the text is selected, copy it by hand." : ""}
        </span>
      </div>
    </section>
  );
}
