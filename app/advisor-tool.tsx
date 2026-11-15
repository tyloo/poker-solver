"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CardKeypadSheet } from "@/components/card-keypad-sheet";
import { Segmented } from "@/components/chart-picker";
import { useI18n } from "@/components/i18n-provider";
import { NumberField } from "@/components/number-field";
import { OvalTable } from "@/components/oval-table";
import { PlayingCard } from "@/components/playing-card";
import { VerdictCard } from "@/components/verdict-card";
import { BLIND_STRUCTURE } from "@/content/blind-structure";
import { advisePreflop, limperGroupsFor, type PreflopAdvice, positionsBefore } from "@/lib/advisor/preflop";
import {
  type AdvisorSetup,
  advisorParams,
  bigBlindChips,
  parseAdvisorParams,
  preflopQuestion,
  type QuestionOrMissing,
  SITUATION_KINDS,
  type SituationKind,
  type StackEntry,
  stackDepthOf,
} from "@/lib/advisor/setup";
import { adviceContextText, chartNoteText, chartTitle, preflopProblemText, verdictSize, verdictTitle } from "@/lib/i18n/advisor";
import { blindLevels } from "@/lib/poker/blinds";
import { cardFromId } from "@/lib/poker/card";
import { MAX_PLAYERS, MIN_PLAYERS, type Position, STACK_TIER_LABELS, stackTierFor, tablePositions } from "@/lib/poker/table";
import { setUrlParams } from "@/lib/url-state";
import { AdvisorPostflop } from "./advisor-postflop";

const LEVELS = blindLevels(BLIND_STRUCTURE, 15);
const PLAYER_COUNTS = Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => String(MIN_PLAYERS + i));
const linkClass = "font-bold text-chalk underline decoration-2 underline-offset-4 focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2";

export type Update = (patch: Partial<AdvisorSetup>, history?: "push" | "replace") => void;

function Frequencies({ actions }: { actions: Extract<PreflopAdvice, { kind: "advice" }>["actions"] }) {
  const { t } = useI18n();
  return (
    <div>
      <div aria-hidden="true" className="flex h-2.5 overflow-hidden rounded-full bg-fold">
        {actions.map((action) => (
          <span key={action.id} style={{ background: `var(--color-${action.colour})`, width: `${action.frequency * 100}%` }} />
        ))}
      </div>
      <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-5 gap-y-1 p-0">
        {actions.map((action) => (
          <li key={action.id} className={`flex items-center gap-2 ${action.frequency > 0 ? "" : "text-dust"}`}>
            <span aria-hidden="true" className="size-3.5 rounded-[3px] border border-dust/40" style={{ background: `var(--color-${action.colour})` }} />
            {t.grid.frequency(t.actions[action.name], action.frequency)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Answer({ setup, prepared, advice, onPickHand }: { setup: AdvisorSetup; prepared: QuestionOrMissing; advice: PreflopAdvice | null; onPickHand: () => void }) {
  const { locale, t, href } = useI18n();
  const [first, second] = setup.hand;

  let card: Parameters<typeof VerdictCard>[0]["verdict"] = null;
  let prompt = "missing" in prepared ? t.advisor.prompts[prepared.missing] : "";
  if (advice?.kind === "invalid") prompt = preflopProblemText(advice.problem, locale);
  if (advice?.kind === "walk") card = { colour: "call", detail: t.advisor.walk.detail, title: t.advisor.walk.title };
  if (advice?.kind === "advice") {
    const { verdict } = advice;
    const frequency = verdict.action.frequency;
    card = {
      aside: frequency >= 1 ? t.advisor.everyTime : t.advisor.ofTheTime(frequency),
      colour: verdict.action.colour,
      detail: verdictSize(verdict, locale, bigBlindChips(setup.stack)),
      title: verdictTitle(verdict, locale),
    };
  }
  const context = advice?.kind === "advice" ? adviceContextText(advice.context, locale) : "";

  return (
    <section aria-label={t.advisor.section} className="flex flex-col gap-4">
      <div className="flex items-stretch gap-4">
        <button
          type="button"
          onClick={onPickHand}
          className="flex shrink-0 items-start gap-1.5 self-center rounded-lg pl-1 focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3"
        >
          <span className="sr-only">{first === undefined ? t.advisor.pickHand : t.advisor.changeHand}</span>
          <PlayingCard card={first === undefined ? null : cardFromId(first)} size="md" className="-rotate-3" />
          <PlayingCard card={second === undefined ? null : cardFromId(second)} size="md" className="mt-1.5 rotate-2" />
        </button>
        <VerdictCard
          className="min-w-0 flex-1"
          label={t.advisor.chartSays}
          verdict={card}
          prompt={prompt}
          flipKey={advice?.kind === "advice" ? `${advice.verdict.name}|${context}` : (advice?.kind ?? "")}
        />
      </div>
      {advice?.kind === "advice" && (
        <>
          <Frequencies actions={advice.actions} />
          <div>
            <p className="m-0 font-bold">{context}</p>
            {advice.note && <p className="m-0 mt-1 text-dust">{chartNoteText(advice.note, locale)}</p>}
            <p className="m-0 mt-1 text-dust">
              <Link href={href(advice.href)} className={linkClass}>
                {t.advisor.seeChart(chartTitle(advice.chart, locale))}
              </Link>
              {advice.baseline && t.advisor.baseline}
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function SituationPicker({ setup, update }: { setup: AdvisorSetup; update: Update }) {
  const { t } = useI18n();
  const { players, position, situation } = setup;
  const atTable = tablePositions(players);
  const before = position ? positionsBefore(players, position) : atTable;
  const limperGroups = position ? limperGroupsFor(players, position) : (["1", "2+"] as const);
  const byOptions = atTable.filter((other) => other !== "BB").map((other) => ({ disabled: !before.includes(other), label: other, value: other }));
  const choose = (next: SituationKind) => {
    const limpers = next === "limps" && !limperGroups.includes(setup.limpers) ? limperGroups[0] : undefined;
    update({ situation: next, ...(limpers && { limpers }) });
  };

  return (
    <section aria-labelledby="situation-heading" className="flex flex-col gap-3">
      <h2 id="situation-heading" className="m-0 font-bold font-display text-3xl leading-none">
        {t.advisor.beforeYou}
      </h2>
      <Segmented
        legend={t.advisor.whatHappened}
        options={SITUATION_KINDS.map((kind) => ({ label: t.advisor.situations[kind], value: kind }))}
        value={situation}
        onChange={choose}
      />
      {situation === "limps" && (
        <Segmented
          legend={t.advisor.limpers}
          options={(["1", "2+"] as const).map((group) => ({ disabled: !limperGroups.includes(group), label: t.charts.limpers[group], value: group }))}
          value={setup.limpers}
          onChange={(limpers) => update({ limpers })}
        />
      )}
      {situation === "open" && (
        <Segmented legend={t.advisor.opener} options={byOptions} value={setup.opener ?? ("" as Position)} onChange={(opener) => update({ opener })} wrap={byOptions.length > 4} />
      )}
      {situation === "push" && (
        <Segmented legend={t.advisor.pusher} options={byOptions} value={setup.pusher ?? ("" as Position)} onChange={(pusher) => update({ pusher })} wrap={byOptions.length > 4} />
      )}
    </section>
  );
}

function StackPicker({ stack, update }: { stack: StackEntry; update: Update }) {
  const { t } = useI18n();
  const depth = stackDepthOf(stack);
  const tier = Number.isFinite(depth) && depth > 0 ? stackTierFor(depth) : null;
  const switchUnit = (unit: StackEntry["unit"]) => {
    if (unit === stack.unit) return;
    const firstBigBlind = LEVELS[0].bb;
    update(
      unit === "bb"
        ? { stack: { bb: tier ? Math.round(depth * 10) / 10 : null, unit } }
        : { stack: { chips: stack.unit === "bb" && stack.bb ? Math.round(stack.bb * firstBigBlind) : null, level: 1, unit } },
    );
  };

  return (
    <section aria-labelledby="stack-heading" className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <h2 id="stack-heading" className="m-0 font-bold font-display text-3xl leading-none">
          {t.advisor.stack}
        </h2>
        <p className="m-0 text-right text-dust" aria-live="polite">
          {tier ? (
            <>
              <span className="font-bold font-display text-2xl text-chalk">{t.advisor.depth(depth)}</span>
              {tier === "push-fold" ? t.advisor.pushFold : t.advisor.tierCharts(STACK_TIER_LABELS[tier])}
            </>
          ) : (
            t.advisor.enterStack
          )}
        </p>
      </div>
      <Segmented
        legend={t.advisor.enterAs}
        options={[
          { label: t.advisor.chipsAndLevel, value: "chips" },
          { label: "bb", value: "bb" },
        ]}
        value={stack.unit}
        onChange={switchUnit}
      />
      {stack.unit === "chips" ? (
        <div className="flex gap-3">
          <NumberField
            className="flex-1"
            label={t.advisor.yourChips}
            unit={t.advisor.chips}
            value={stack.chips}
            onChange={(value) => update({ stack: { ...stack, chips: value } }, "replace")}
          />
          <div className="min-w-0 flex-1">
            <label htmlFor="blind-level" className="mb-1.5 block text-dust">
              {t.advisor.blindLevel}
            </label>
            <select
              id="blind-level"
              value={stack.level}
              onChange={(event) => update({ stack: { ...stack, level: Number(event.target.value) } }, "replace")}
              className="h-12 w-full rounded-xl bg-booth px-3 font-bold text-chalk text-lg focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2"
            >
              {LEVELS.map((level, index) => (
                <option key={index} value={index + 1}>
                  {t.common.level(index + 1, level.sb, level.bb)}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <NumberField label={t.advisor.yourStack} unit="bb" decimal value={stack.bb} onChange={(value) => update({ stack: { bb: value, unit: "bb" } }, "replace")} />
      )}
    </section>
  );
}

export function AdvisorTool() {
  const { t } = useI18n();
  const params = useSearchParams();
  const setup = parseAdvisorParams(params);
  const [picking, setPicking] = useState(false);
  const update: Update = (patch, history = "push") => setUrlParams(advisorParams(patch), history);
  const prepared = preflopQuestion(setup);
  const advice = "question" in prepared ? advisePreflop(prepared.question) : null;

  const takePosition = (position: Position) => {
    const before = positionsBefore(setup.players, position);
    update({
      position,
      ...(setup.opener && !before.includes(setup.opener) && { opener: null }),
      ...(setup.pusher && !before.includes(setup.pusher) && { pusher: null }),
    });
  };
  const setPlayers = (players: number) => {
    const atTable = tablePositions(players);
    const kept = (position: Position | null) => position === null || atTable.includes(position);
    update({ players, ...(!kept(setup.position) && { position: null }), ...(!kept(setup.opener) && { opener: null }), ...(!kept(setup.pusher) && { pusher: null }) });
  };
  const marks: Partial<Record<Position, string>> = {};
  if (setup.situation === "open" && setup.opener) marks[setup.opener] = t.advisor.opened;
  if (setup.situation === "push" && setup.pusher) marks[setup.pusher] = t.advisor.pushed;

  return (
    <div className="flex flex-col gap-8">
      <Answer setup={setup} prepared={prepared} advice={advice} onPickHand={() => setPicking(true)} />

      <section aria-labelledby="table-heading" className="flex flex-col gap-3">
        <h2 id="table-heading" className="m-0 font-bold font-display text-3xl leading-none">
          {t.advisor.table}
        </h2>
        <Segmented
          legend={t.advisor.players}
          options={PLAYER_COUNTS.map((count) => ({ label: count, value: count }))}
          value={String(setup.players)}
          onChange={(count) => setPlayers(Number(count))}
        />
        <OvalTable players={setup.players} position={setup.position} onPosition={takePosition} marks={marks} />
      </section>

      <SituationPicker setup={setup} update={update} />
      <StackPicker stack={setup.stack} update={update} />
      <AdvisorPostflop setup={setup} question={"question" in prepared ? prepared.question : null} advice={advice} update={update} />

      {picking && (
        <CardKeypadSheet
          title={t.common.yourHand}
          value={[]}
          max={2}
          unavailable={setup.board}
          onDone={(hand) => {
            if (hand.length === 2) update({ hand });
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}
