"use client";

import { type KeyboardEvent, useRef, useState } from "react";
import { HAND_CLASS_COUNT, HAND_CLASS_NAMES, type HandClassId } from "@/lib/poker/combo";

/** A coloured share of a grid square, filled left to right; the rest shows the Fold colour. */
export type GridSegment = { share: number; color: string };

type Props = {
  /** Accessible name of the whole grid. */
  label: string;
  segments: (cls: HandClassId) => readonly GridSegment[];
  /** Accessible name of one Hand class; defaults to its name, e.g. "AKs". */
  describe?: (cls: HandClassId) => string;
  /** Highlights one Hand class, e.g. the one whose details are shown. */
  selected?: HandClassId | null;
  /** Makes each square a button; the page still scrolls over the grid. */
  onSelect?: (cls: HandClassId) => void;
  /**
   * Makes the grid paintable: called with `start` true for the tapped (or keyboard-activated)
   * Hand class, then false for each class a drag enters.
   */
  onPaint?: (cls: HandClassId, start: boolean) => void;
};

const CLASSES = Array.from({ length: HAND_CLASS_COUNT }, (_, cls) => cls);
const ARROW_STEPS: Record<string, number> = { ArrowDown: 13, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -13 };

function Fill({ segments }: { segments: readonly GridSegment[] }) {
  return (
    <span aria-hidden="true" className="absolute inset-0 flex">
      {segments.map((segment, i) => (
        <span key={i} style={{ background: segment.color, width: `${segment.share * 100}%` }} />
      ))}
    </span>
  );
}

/** The 13×13 Hand class grid: pairs on the diagonal, suited above it, offsuit below. */
export function HandGrid({ label, segments, describe = (cls) => HAND_CLASS_NAMES[cls], selected = null, onSelect, onPaint }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const strokeRef = useRef<HandClassId | null>(null);
  const [focused, setFocused] = useState<HandClassId>(0);
  const interactive = Boolean(onSelect || onPaint);

  const classAt = (x: number, y: number): HandClassId | null => {
    const square = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-class]");
    return square && gridRef.current?.contains(square) ? Number(square.dataset.class) : null;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = ARROW_STEPS[event.key];
    const target = step === undefined ? (event.key === "Home" ? 0 : event.key === "End" ? HAND_CLASS_COUNT - 1 : null) : focused + step;
    if (target === null) return;
    event.preventDefault();
    if (target < 0 || target >= HAND_CLASS_COUNT || (Math.abs(step) === 1 && Math.floor(target / 13) !== Math.floor(focused / 13))) return;
    setFocused(target);
    gridRef.current?.querySelector<HTMLElement>(`[data-class="${target}"]`)?.focus();
  };

  const squareClass = (cls: HandClassId) => {
    const filled = segments(cls).reduce((sum, segment) => sum + segment.share, 0) >= 0.5;
    const ring = cls === selected ? "z-10 outline-2 outline-chalk outline-offset-1" : "";
    return `relative flex aspect-square items-center justify-center overflow-hidden rounded-[3px] bg-fold font-bold font-display text-[0.8125rem] leading-none ${
      filled ? "text-night" : "text-chalk"
    } ${ring}`;
  };

  if (!interactive) {
    return (
      // biome-ignore lint/a11y/useSemanticElements: a <fieldset> does not lay out reliably as a CSS grid.
      <div role="group" aria-label={label} className="grid grid-cols-13 gap-px">
        {CLASSES.map((cls) => (
          <span key={cls} role="img" aria-label={describe(cls)} className={squareClass(cls)}>
            <Fill segments={segments(cls)} />
            <span className="relative">{HAND_CLASS_NAMES[cls]}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset> does not lay out reliably as a CSS grid.
    <div
      ref={gridRef}
      role="group"
      aria-label={label}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        if (!onPaint || event.button !== 0) return;
        const cls = classAt(event.clientX, event.clientY);
        if (cls === null) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        strokeRef.current = cls;
        setFocused(cls);
        onPaint(cls, true);
      }}
      onPointerMove={(event) => {
        if (!onPaint || strokeRef.current === null) return;
        const cls = classAt(event.clientX, event.clientY);
        if (cls === null || cls === strokeRef.current) return;
        strokeRef.current = cls;
        onPaint(cls, false);
      }}
      onPointerUp={() => {
        strokeRef.current = null;
      }}
      onPointerCancel={() => {
        strokeRef.current = null;
      }}
      className={`grid select-none grid-cols-13 gap-px ${onPaint ? "touch-none" : ""}`}
    >
      {CLASSES.map((cls) => (
        <button
          key={cls}
          type="button"
          data-class={cls}
          tabIndex={cls === focused ? 0 : -1}
          aria-label={describe(cls)}
          aria-pressed={onSelect ? cls === selected : undefined}
          onClick={(event) => {
            setFocused(cls);
            if (onSelect) onSelect(cls);
            // Pointer taps paint on pointerdown; this catches Enter and Space.
            else if (event.detail === 0) onPaint?.(cls, true);
          }}
          className={`${squareClass(cls)} focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-chalk focus-visible:outline-offset-1`}
        >
          <Fill segments={segments(cls)} />
          <span className="relative">{HAND_CLASS_NAMES[cls]}</span>
        </button>
      ))}
    </div>
  );
}
