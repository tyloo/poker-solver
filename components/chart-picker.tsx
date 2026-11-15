"use client";

import { type ChartSelection, chartKeyFor, groupAvailable, heroPositions, LIMPER_GROUPS, OPENER_GROUPS, SITUATION_LABELS, SITUATIONS } from "@/lib/charts/model";
import { POSITIONS, STACK_TIER_LABELS, STACK_TIERS } from "@/lib/poker/table";

type Option<T> = { value: T; label: string; disabled?: boolean };

function Segmented<T extends string>({ legend, options, value, onChange }: { legend: string; options: readonly Option<T>[]; value: T; onChange: (value: T) => void }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1.5 p-0 text-dust">{legend}</legend>
      <div className="flex gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className="h-11 min-w-0 flex-1 rounded-xl bg-booth px-1 font-bold font-display text-lg leading-none transition-colors hover:enabled:text-chalk focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2 disabled:opacity-35 aria-pressed:bg-chalk aria-pressed:text-night"
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const OPENER_LABELS = { early: "Early", late: "Late", middle: "Middle" } as const;
const LIMPER_LABELS = { "1": "1 limper", "2+": "2+ limpers" } as const;

/** Picks a Chart by Situation, Position, opener or limper group and (optionally) Stack tier. Impossible combinations are disabled. */
export function ChartPicker({ value, onChange, showTier = true }: { value: ChartSelection; onChange: (value: ChartSelection) => void; showTier?: boolean }) {
  const key = chartKeyFor(value);
  const current: ChartSelection = {
    ...value,
    position: key.position,
    ...(key.situation === "vs-open" && { opener: key.opener }),
    ...(key.situation === "vs-limpers" && { limpers: key.limpers }),
  };
  const change = (patch: Partial<ChartSelection>) => {
    const next = chartKeyFor({ ...current, ...patch });
    onChange({
      ...current,
      ...patch,
      position: next.position,
      ...(next.situation === "vs-open" && { opener: next.opener }),
      ...(next.situation === "vs-limpers" && { limpers: next.limpers }),
    });
  };
  const seats = heroPositions(value.situation);

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        legend="Situation"
        options={SITUATIONS.map((situation) => ({ label: SITUATION_LABELS[situation], value: situation }))}
        value={current.situation}
        onChange={(situation) => change({ situation })}
      />
      <Segmented
        legend="Your position"
        options={POSITIONS.map((position) => ({ disabled: !seats.includes(position), label: position, value: position }))}
        value={current.position}
        onChange={(position) => change({ position })}
      />
      {current.situation === "vs-open" && (
        <Segmented
          legend="Opener"
          options={OPENER_GROUPS.map((opener) => ({ disabled: !groupAvailable("vs-open", current.position, opener), label: OPENER_LABELS[opener], value: opener }))}
          value={current.opener}
          onChange={(opener) => change({ opener })}
        />
      )}
      {current.situation === "vs-limpers" && (
        <Segmented
          legend="Limpers"
          options={LIMPER_GROUPS.map((limpers) => ({ disabled: !groupAvailable("vs-limpers", current.position, limpers), label: LIMPER_LABELS[limpers], value: limpers }))}
          value={current.limpers}
          onChange={(limpers) => change({ limpers })}
        />
      )}
      {showTier && (
        <Segmented
          legend="Stack"
          options={STACK_TIERS.map((tier) => ({ label: STACK_TIER_LABELS[tier], value: tier }))}
          value={current.tier}
          onChange={(tier) => change({ tier })}
        />
      )}
    </div>
  );
}
