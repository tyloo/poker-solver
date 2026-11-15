"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CardKeypadSheet } from "@/components/card-keypad-sheet";
import { Segmented } from "@/components/chart-picker";
import { NumberField } from "@/components/number-field";
import { OvalTable } from "@/components/oval-table";
import { PlayingCard } from "@/components/playing-card";
import { VerdictCard } from "@/components/verdict-card";
import { BLIND_STRUCTURE } from "@/content/blind-structure";
import { advisePreflop, limperGroupsFor, type PreflopAdvice, seatsBefore, verdictSize } from "@/lib/advisor/preflop";
import {
  type AdvisorSetup,
  advisorParams,
  bigBlindChips,
  parseAdvisorParams,
  preflopSpot,
  SITUATION_KINDS,
  type SituationKind,
  type SpotOrMissing,
  type StackEntry,
  stackDepthOf,
} from "@/lib/advisor/setup";
import { blindLevels } from "@/lib/poker/blinds";
import { cardFromId } from "@/lib/poker/card";
import { MAX_PLAYERS, MIN_PLAYERS, type Position, STACK_TIER_LABELS, stackTierFor, tablePositions } from "@/lib/poker/table";
import { setUrlParams } from "@/lib/url-state";
import { AdvisorPostflop } from "./advisor-postflop";

const LEVELS = blindLevels(BLIND_STRUCTURE, 15);
const PLAYER_COUNTS = Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => String(MIN_PLAYERS + i));
const SITUATION_LABELS: Record<SituationKind, string> = { folded: "Folded", limps: "Limps", open: "Open", push: "Push" };
const PROMPTS = { hand: "Pick your hand", opener: "Who opened?", position: "Tap your seat", pusher: "Who pushed?" } as const;

const chips = (value: number) => value.toLocaleString("en-US");
const percent = (share: number) => `${Math.round(share * 100)}%`;
const linkClass = "font-bold text-chalk underline decoration-2 underline-offset-4 focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2";

export type Update = (patch: Partial<AdvisorSetup>, history?: "push" | "replace") => void;

function Frequencies({ actions }: { actions: Extract<PreflopAdvice, { kind: "advice" }>["actions"] }) {
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
            {action.label} {percent(action.frequency)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Answer({ setup, prepared, advice, onPickHand }: { setup: AdvisorSetup; prepared: SpotOrMissing; advice: PreflopAdvice | null; onPickHand: () => void }) {
  const [first, second] = setup.hand;

  let card: Parameters<typeof VerdictCard>[0]["verdict"] = null;
  let prompt = "missing" in prepared ? PROMPTS[prepared.missing] : "";
  if (advice?.kind === "invalid") prompt = advice.reason;
  if (advice?.kind === "walk") card = { colour: "call", detail: "Everyone folded: the blinds are yours.", title: "Walk" };
  if (advice?.kind === "advice") {
    const { verdict } = advice;
    const frequency = verdict.action.frequency;
    card = {
      aside: frequency >= 1 ? "Every time" : `${percent(frequency)} of the time`,
      colour: verdict.action.colour,
      detail: verdictSize(verdict, bigBlindChips(setup.stack)),
      title: verdict.title,
    };
  }

  return (
    <section aria-label="Your hand and the play" className="flex flex-col gap-4">
      <div className="flex items-stretch gap-4">
        <button
          type="button"
          onClick={onPickHand}
          className="flex shrink-0 items-start gap-1.5 self-center rounded-lg pl-1 focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3"
        >
          <span className="sr-only">{first === undefined ? "Pick your hand" : "Change your hand"}</span>
          <PlayingCard card={first === undefined ? null : cardFromId(first)} size="md" className="-rotate-3" />
          <PlayingCard card={second === undefined ? null : cardFromId(second)} size="md" className="mt-1.5 rotate-2" />
        </button>
        <VerdictCard
          className="min-w-0 flex-1"
          label="Your Chart says"
          verdict={card}
          prompt={prompt}
          flipKey={advice?.kind === "advice" ? `${advice.verdict.title}|${advice.context}` : (advice?.kind ?? "")}
        />
      </div>
      {advice?.kind === "advice" && (
        <>
          <Frequencies actions={advice.actions} />
          <div>
            <p className="m-0 font-bold">{advice.context}</p>
            {advice.note && <p className="m-0 mt-1 text-dust">{advice.note}</p>}
            <p className="m-0 mt-1 text-dust">
              <Link href={advice.href} className={linkClass}>
                See the {advice.chartTitle} chart
              </Link>
              {advice.baseline && " (baseline, not yet tuned)"}
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function SituationPicker({ setup, update }: { setup: AdvisorSetup; update: Update }) {
  const { players, position, situation } = setup;
  const seats = tablePositions(players);
  const before = position ? seatsBefore(players, position) : seats;
  const limperGroups = position ? limperGroupsFor(players, position) : (["1", "2+"] as const);
  const byOptions = seats.filter((seat) => seat !== "BB").map((seat) => ({ disabled: !before.includes(seat), label: seat, value: seat }));
  const choose = (next: SituationKind) => {
    const limpers = next === "limps" && !limperGroups.includes(setup.limpers) ? limperGroups[0] : undefined;
    update({ situation: next, ...(limpers && { limpers }) });
  };

  return (
    <section aria-labelledby="situation-heading" className="flex flex-col gap-3">
      <h2 id="situation-heading" className="m-0 font-bold font-display text-3xl leading-none">
        Before you
      </h2>
      <Segmented
        legend="What happened before you acted"
        options={SITUATION_KINDS.map((kind) => ({ label: SITUATION_LABELS[kind], value: kind }))}
        value={situation}
        onChange={choose}
      />
      {situation === "limps" && (
        <Segmented
          legend="Limpers"
          options={(["1", "2+"] as const).map((group) => ({ disabled: !limperGroups.includes(group), label: group === "1" ? "1 limper" : "2+ limpers", value: group }))}
          value={setup.limpers}
          onChange={(limpers) => update({ limpers })}
        />
      )}
      {situation === "open" && (
        <Segmented legend="Opener" options={byOptions} value={setup.opener ?? ("" as Position)} onChange={(opener) => update({ opener })} wrap={byOptions.length > 4} />
      )}
      {situation === "push" && (
        <Segmented legend="Pusher" options={byOptions} value={setup.pusher ?? ("" as Position)} onChange={(pusher) => update({ pusher })} wrap={byOptions.length > 4} />
      )}
    </section>
  );
}

function StackPicker({ stack, update }: { stack: StackEntry; update: Update }) {
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
          Stack
        </h2>
        <p className="m-0 text-right text-dust" aria-live="polite">
          {tier ? (
            <>
              <span className="font-bold font-display text-2xl text-chalk">{`${Math.round(depth * 10) / 10}bb`}</span>
              {` ${tier === "push-fold" ? "push/fold" : `${STACK_TIER_LABELS[tier]} Charts`}`}
            </>
          ) : (
            "Enter your stack"
          )}
        </p>
      </div>
      <Segmented
        legend="Enter it as"
        options={[
          { label: "Chips and level", value: "chips" },
          { label: "bb", value: "bb" },
        ]}
        value={stack.unit}
        onChange={switchUnit}
      />
      {stack.unit === "chips" ? (
        <div className="flex gap-3">
          <NumberField className="flex-1" label="Your chips" unit="chips" value={stack.chips} onChange={(value) => update({ stack: { ...stack, chips: value } }, "replace")} />
          <div className="min-w-0 flex-1">
            <label htmlFor="blind-level" className="mb-1.5 block text-dust">
              Blind level
            </label>
            <select
              id="blind-level"
              value={stack.level}
              onChange={(event) => update({ stack: { ...stack, level: Number(event.target.value) } }, "replace")}
              className="h-12 w-full rounded-xl bg-booth px-3 font-bold text-chalk text-lg focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2"
            >
              {LEVELS.map((level, index) => (
                <option key={index} value={index + 1}>
                  {`${index + 1}: ${chips(level.sb)}/${chips(level.bb)}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <NumberField label="Your stack" unit="bb" decimal value={stack.bb} onChange={(value) => update({ stack: { bb: value, unit: "bb" } }, "replace")} />
      )}
    </section>
  );
}

export function AdvisorTool() {
  const params = useSearchParams();
  const setup = parseAdvisorParams(params);
  const [picking, setPicking] = useState(false);
  const update: Update = (patch, history = "push") => setUrlParams(advisorParams(patch), history);
  const prepared = preflopSpot(setup);
  const advice = "spot" in prepared ? advisePreflop(prepared.spot) : null;

  const sitAt = (position: Position) => {
    const before = seatsBefore(setup.players, position);
    update({
      position,
      ...(setup.opener && !before.includes(setup.opener) && { opener: null }),
      ...(setup.pusher && !before.includes(setup.pusher) && { pusher: null }),
    });
  };
  const seatPlayers = (players: number) => {
    const seats = tablePositions(players);
    const seated = (position: Position | null) => position === null || seats.includes(position);
    update({ players, ...(!seated(setup.position) && { position: null }), ...(!seated(setup.opener) && { opener: null }), ...(!seated(setup.pusher) && { pusher: null }) });
  };
  const marks: Partial<Record<Position, string>> = {};
  if (setup.situation === "open" && setup.opener) marks[setup.opener] = "Opened";
  if (setup.situation === "push" && setup.pusher) marks[setup.pusher] = "Pushed";

  return (
    <div className="flex flex-col gap-8">
      <Answer setup={setup} prepared={prepared} advice={advice} onPickHand={() => setPicking(true)} />

      <section aria-labelledby="table-heading" className="flex flex-col gap-3">
        <h2 id="table-heading" className="m-0 font-bold font-display text-3xl leading-none">
          Table
        </h2>
        <Segmented
          legend="Players"
          options={PLAYER_COUNTS.map((count) => ({ label: count, value: count }))}
          value={String(setup.players)}
          onChange={(count) => seatPlayers(Number(count))}
        />
        <OvalTable players={setup.players} position={setup.position} onPosition={sitAt} marks={marks} />
      </section>

      <SituationPicker setup={setup} update={update} />
      <StackPicker stack={setup.stack} update={update} />
      <AdvisorPostflop setup={setup} spot={"spot" in prepared ? prepared.spot : null} advice={advice} update={update} />

      {picking && (
        <CardKeypadSheet
          title="Your hand"
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
