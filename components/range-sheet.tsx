"use client";

import { type ReactNode, useRef, useState } from "react";
import { formatPercent } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";
import { rangeErrorText } from "@/lib/i18n/range";
import { HAND_CLASS_NAMES } from "@/lib/poker/combo";
import { createRange, formatRange, handClassWeights, parseRange, type Range, rangeCombos, rangeShare, setHandClassWeight } from "@/lib/poker/range";
import { primaryButton, textButton } from "./buttons";
import { useI18n } from "./i18n-provider";
import { RangeGrid } from "./range-grid";
import { Sheet } from "./sheet";

type Props = {
  title: string;
  /** Range string to start from. */
  value: string;
  onDone: (range: string) => void;
  onClose: () => void;
  /**
   * Slot for other ways to fill the Range, such as loading a Chart or a Player type.
   * It receives a function that replaces the Range being edited.
   */
  load?: (apply: (range: Range) => void) => ReactNode;
};

/** "18 combos, 1.4% of hands". */
export const rangeSummary = (range: Range, locale: Locale): string => messages(locale).rangeSheet.summary(rangeCombos(range), rangeShare(range));

/** Edits a Range on the 13×13 grid or as a range string; nothing changes until Done. */
export function RangeSheet({ title, value, onDone, onClose, load }: Props) {
  const { locale, t } = useI18n();
  const [range, setRange] = useState<Range>(() => {
    const parsed = parseRange(value);
    return parsed.ok ? parsed.range : createRange();
  });
  const [text, setText] = useState(() => {
    const parsed = parseRange(value);
    return parsed.ok ? formatRange(parsed.range) : value;
  });
  const [error, setError] = useState<string | null>(null);
  const paintRef = useRef(1);
  const weights = handClassWeights(range);

  const replace = (next: Range) => {
    setRange(next);
    setText(formatRange(next));
    setError(null);
  };

  const paint = (cls: number, start: boolean) => {
    if (start) paintRef.current = weights[cls] > 0 ? 0 : 1;
    if (!start && weights[cls] === paintRef.current) return;
    const next = range.slice();
    setHandClassWeight(next, cls, paintRef.current);
    replace(next);
  };

  return (
    <Sheet
      title={title}
      onClose={onClose}
      actions={
        <button type="button" disabled={error !== null} onClick={() => onDone(formatRange(range))} className={primaryButton}>
          {t.common.done}
        </button>
      }
    >
      <RangeGrid
        label={t.rangeSheet.gridLabel}
        segments={(cls) => (weights[cls] > 0 ? [{ color: "var(--color-chalk)", share: weights[cls] }] : [])}
        describe={(cls) =>
          `${HAND_CLASS_NAMES[cls]}, ${weights[cls] > 0 ? (weights[cls] === 1 ? t.rangeSheet.inRange : formatPercent(weights[cls], locale)) : t.rangeSheet.notInRange}`
        }
        onPaint={paint}
      />
      <p className="mt-2 mb-4 text-dust">{rangeSummary(range, locale)}</p>

      <label className="block">
        <span className="mb-1 block font-bold">{t.common.rangeString}</span>
        <textarea
          value={text}
          rows={2}
          spellCheck={false}
          autoCapitalize="characters"
          autoComplete="off"
          aria-invalid={error !== null}
          aria-describedby={error ? "range-error" : undefined}
          onChange={(event) => {
            setText(event.target.value);
            const parsed = parseRange(event.target.value);
            if (parsed.ok) {
              setRange(parsed.range);
              setError(null);
            } else setError(rangeErrorText(parsed.error, locale));
          }}
          className="block w-full resize-none rounded-xl border-2 border-night bg-night px-3 py-2 text-chalk focus-visible:border-chalk focus-visible:outline-none aria-invalid:border-raise"
        />
      </label>
      {error && (
        <p id="range-error" className="mt-1 mb-0 text-raise">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {load?.(replace)}
        <button type="button" onClick={() => replace(createRange())} className={textButton}>
          {t.common.clear}
        </button>
      </div>
    </Sheet>
  );
}
