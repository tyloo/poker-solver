"use client";

import { useI18n } from "@/components/i18n-provider";
import { RangeGrid } from "@/components/range-grid";
import { pushFoldFrequencies } from "@/lib/charts/charts";
import { depthSpans, describePushFold, largestDepths, PUSH_FOLD_DEPTHS, type PushFoldDepth, type PushFoldSeries, pushersFacing } from "@/lib/charts/push-fold";
import { HAND_CLASS_NAMES, type HandClassId, handClassCombos } from "@/lib/poker/combo";
import { codecs, HAND_CLASS_PARAM, useUrlState } from "@/lib/url-state";

const DEEPEST = PUSH_FOLD_DEPTHS[PUSH_FOLD_DEPTHS.length - 1];

/** Shallow depths (to 7bb) take chalk text, deeper ones night text. */
const isDeep = (depth: PushFoldDepth) => depth >= 8;

/**
 * The action colour mixed into Fold, more of it the deeper the hand is played. Two bands keep the
 * depth number at AA contrast: up to 36% under chalk text, from 60% (Push) or 72% (Call) under night text.
 */
function heat(colour: "push" | "call", depth: PushFoldDepth): string {
  const deepFrom = colour === "push" ? 60 : 72;
  const share = isDeep(depth) ? deepFrom + ((100 - deepFrom) * (depth - 8)) / (DEEPEST - 8) : 8 + (28 * (depth - 1)) / 6;
  return `color-mix(in srgb, var(--color-${colour}) ${Math.round(share)}%, var(--color-fold))`;
}

const depthLabel = (depth: PushFoldDepth) => (depth === DEEPEST ? `${depth}+` : String(depth));

/** One grid for a Push or Vs push series: each Hand class shows the largest depth at which it is still played. */
export function PushFoldView({ series }: { series: PushFoldSeries }) {
  const { locale, t } = useI18n();
  const text = t.pushFold;
  const [selected, setSelected] = useUrlState(HAND_CLASS_PARAM, codecs.handClass(null));
  const byDepth = pushFoldFrequencies(series);
  const largest = largestDepths(byDepth);
  const colour = series.situation === "push" ? "push" : "call";
  const push = series.situation === "push";
  const title = describePushFold(series, locale);

  const describe = (cls: HandClassId) => {
    const depth = largest[cls];
    return depth === null ? text.never(HAND_CLASS_NAMES[cls], push) : text.upTo(HAND_CLASS_NAMES[cls], depthLabel(depth), push);
  };
  const summary = (cls: HandClassId) => {
    const spans = depthSpans(byDepth, cls, locale);
    const mixed = PUSH_FOLD_DEPTHS.filter((depth) => byDepth[depth - 1][cls] > 0 && byDepth[depth - 1][cls] < 1).map((depth) => ({ depth, share: byDepth[depth - 1][cls] }));
    const played = spans ? text.playedAt(spans, push) : text.neverPlayed(DEEPEST, push);
    return text.summary(HAND_CLASS_NAMES[cls], handClassCombos(cls).length, played, mixed.length > 0 ? text.mixed(mixed) : "");
  };
  const pushers = series.situation === "vs-push" ? pushersFacing(series.position, series.pusher) : [];

  return (
    <section aria-labelledby="chart-title" className="flex flex-col gap-4">
      <div>
        <h2 id="chart-title" className="m-0 font-bold font-display text-3xl leading-none">
          {title}
        </h2>
        <p className="mt-1 mb-0 text-dust">
          {push ? text.foldedToYou : pushers.length > 1 ? text.averaged(pushers) : text.facing(pushers[0])}
          {text.explain(DEEPEST, push)}
        </p>
      </div>
      <RangeGrid
        label={text.gridLabel(title)}
        segments={(cls) => {
          const depth = largest[cls];
          return depth === null ? [] : [{ color: heat(colour, depth), share: 1 }];
        }}
        content={(cls) => {
          const depth = largest[cls];
          if (depth === null) return "";
          return <span className={isDeep(depth) ? "text-night" : "text-chalk"}>{depthLabel(depth)}</span>;
        }}
        describe={describe}
        selected={selected}
        onSelect={(cls) => setSelected(cls === selected ? null : cls)}
      />
      <p aria-live="polite" className="m-0 min-h-[3em] text-dust">
        {selected === null ? text.tapHand : <span className="text-chalk">{summary(selected)}</span>}
      </p>
      <p className="m-0 rounded-2xl border-2 border-booth border-dashed px-4 py-3 text-dust">
        {text.model.before}
        <code className="text-chalk text-sm">content/charts/{series.situation}.ts</code>
        {text.model.middle}
        <code className="text-chalk text-sm">pnpm generate:push-fold</code>
        {text.model.after}
      </p>
    </section>
  );
}
