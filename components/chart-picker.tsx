"use client";

import { type ChartSelection, chartKeyFor, groupAvailable, heroPositions, LIMPER_GROUPS, OPENER_GROUPS, SITUATIONS } from "@/lib/charts/model";
import { type BrowseSelection, browseSeries, callerPositions, isPushFoldSituation, PUSH_FOLD_SITUATIONS, PUSH_POSITIONS, PUSHER_GROUPS } from "@/lib/charts/push-fold";
import { POSITIONS, type Position, STACK_TIER_LABELS, STACK_TIERS } from "@/lib/poker/table";
import { useI18n } from "./i18n-provider";

type Option<T> = { value: T; label: string; disabled?: boolean };

export function Segmented<T extends string>({
  legend,
  options,
  value,
  onChange,
  wrap = false,
}: {
  legend: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Lays out three options per row. */
  wrap?: boolean;
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1.5 p-0 text-dust">{legend}</legend>
      <div className={`flex gap-1 ${wrap ? "flex-wrap" : ""}`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={`h-11 min-w-0 ${wrap ? "grow basis-[calc((100%-0.5rem)/3)]" : "flex-1"} rounded-xl bg-booth px-1 font-bold font-display text-lg leading-none transition-colors hover:enabled:not-aria-pressed:text-chalk focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2 disabled:opacity-35 aria-pressed:bg-chalk aria-pressed:text-night`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

type PickerProps =
  | { value: ChartSelection; onChange: (value: ChartSelection) => void; showTier?: boolean; pushFold?: false }
  | {
      value: BrowseSelection;
      onChange: (value: BrowseSelection) => void;
      showTier?: boolean;
      /** Also offers the Push and Vs push Situations, which cover every depth and so have no Stack tier. */
      pushFold: true;
    };

/** Moves impossible Positions and groups to the nearest valid ones. */
function normalise(selection: BrowseSelection): BrowseSelection {
  const { situation } = selection;
  if (isPushFoldSituation(situation)) {
    const series = browseSeries({ ...selection, situation });
    return { ...selection, position: series.position, ...(series.situation === "vs-push" && { opener: series.pusher }) };
  }
  const key = chartKeyFor({ ...selection, situation });
  return {
    ...selection,
    position: key.position,
    ...(key.situation === "vs-open" && { opener: key.opener }),
    ...(key.situation === "vs-limpers" && { limpers: key.limpers }),
  };
}

function positionsFor(situation: BrowseSelection["situation"]): readonly Position[] {
  if (situation === "push") return PUSH_POSITIONS;
  if (situation === "vs-push") return callerPositions("early");
  return heroPositions(situation);
}

/** Picks a Chart by Situation, Position, opener or limper group and (optionally) Stack tier. Impossible combinations are disabled. */
export function ChartPicker(props: PickerProps) {
  const { t } = useI18n();
  const labels = t.charts;
  const { showTier = true, pushFold = false } = props;
  const onChange = props.onChange as (value: BrowseSelection) => void;
  const current = normalise(props.value);
  const change = (patch: Partial<BrowseSelection>) => onChange(normalise({ ...current, ...patch }));
  const positions = positionsFor(current.situation);
  const situations = [
    ...SITUATIONS.map((situation) => ({ label: labels.situations[situation], value: situation })),
    ...(pushFold ? PUSH_FOLD_SITUATIONS.map((situation) => ({ label: labels.situations[situation], value: situation })) : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <Segmented legend={t.picker.situation} options={situations} value={current.situation} onChange={(situation) => change({ situation })} wrap={pushFold} />
      <Segmented
        legend={t.picker.position}
        options={POSITIONS.map((position) => ({ disabled: !positions.includes(position), label: position, value: position }))}
        value={current.position}
        onChange={(position) => change({ position })}
      />
      {current.situation === "vs-open" && (
        <Segmented
          legend={t.picker.opener}
          options={OPENER_GROUPS.map((opener) => ({ disabled: !groupAvailable("vs-open", current.position, opener), label: labels.groups[opener], value: opener }))}
          value={current.opener}
          onChange={(opener) => change({ opener })}
        />
      )}
      {current.situation === "vs-push" && (
        <Segmented
          legend={t.picker.pusher}
          options={PUSHER_GROUPS.map((opener) => ({ disabled: !callerPositions(opener).includes(current.position), label: labels.groups[opener], value: opener }))}
          value={current.opener}
          onChange={(opener) => change({ opener })}
        />
      )}
      {current.situation === "vs-limpers" && (
        <Segmented
          legend={t.picker.limpers}
          options={LIMPER_GROUPS.map((limpers) => ({ disabled: !groupAvailable("vs-limpers", current.position, limpers), label: labels.limpers[limpers], value: limpers }))}
          value={current.limpers}
          onChange={(limpers) => change({ limpers })}
        />
      )}
      {showTier && !isPushFoldSituation(current.situation) && (
        <Segmented
          legend={t.picker.stack}
          options={STACK_TIERS.map((tier) => ({ label: STACK_TIER_LABELS[tier], value: tier }))}
          value={current.tier}
          onChange={(tier) => change({ tier })}
        />
      )}
    </div>
  );
}
