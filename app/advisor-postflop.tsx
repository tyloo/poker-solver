"use client";

import Link from "next/link";
import { useState } from "react";
import { primaryButton, textButton } from "@/components/buttons";
import { CardKeypadSheet } from "@/components/card-keypad-sheet";
import { Segmented } from "@/components/chart-picker";
import { NumberField } from "@/components/number-field";
import { PlayingCard } from "@/components/playing-card";
import { VerdictCard } from "@/components/verdict-card";
import {
  defaultOpponents,
  type Opponent,
  opponentPositions,
  opponentRange,
  type PostflopLine,
  type PostflopVerdictKind,
  postflopLine,
  postflopNumbers,
  postflopVerdict,
  solverLinkFor,
} from "@/lib/advisor/postflop";
import type { PreflopAdvice, PreflopQuestion } from "@/lib/advisor/preflop";
import { type AdvisorSetup, toUnit } from "@/lib/advisor/setup";
import type { ActionColour } from "@/lib/charts/model";
import { PLAYER_TYPE_LABELS, PLAYER_TYPES } from "@/lib/charts/player-types";
import type { EquityInput, EquityResult } from "@/lib/equity/engine";
import { type EquityRun, useEquity } from "@/lib/equity/use-equity";
import { formatPercent } from "@/lib/format";
import { type CardId, cardFromId } from "@/lib/poker/card";
import type { Range } from "@/lib/poker/range";
import { solverHref } from "@/lib/solver/spot-url";
import type { Update } from "./advisor-tool";

const VERDICT_COLOURS: Record<PostflopVerdictKind, ActionColour> = { bet: "raise", call: "call", check: "call", fold: "fold", push: "push" };
const MAX_OPPONENTS = 7;

const percent = (share: number) => formatPercent(share, 1);
const count = (value: number) => value.toLocaleString("en-US");

type Props = { setup: AdvisorSetup; question: PreflopQuestion | null; advice: PreflopAdvice | null; update: Update };

export function AdvisorPostflop({ setup, question, advice, update }: Props) {
  const [picking, setPicking] = useState(false);
  const { board } = setup;
  const line = question && advice ? postflopLine(question, advice) : null;

  return (
    <section aria-labelledby="postflop-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="postflop-heading" className="m-0 font-bold font-display text-3xl leading-none">
          Postflop
        </h2>
        {board.length > 0 && (
          <button type="button" onClick={() => update({ board: [] })} className={`-mr-4 ${textButton}`}>
            Clear<span className="sr-only"> board</span>
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setPicking(true)}
        className="flex flex-wrap gap-2 self-start rounded-lg focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3"
      >
        <span className="sr-only">{board.length > 0 ? "Edit the board" : "Add board cards"}</span>
        {Array.from({ length: 5 }, (_, i) => (
          <PlayingCard key={i} card={board[i] === undefined ? null : cardFromId(board[i])} size="md" />
        ))}
      </button>

      {!line ? (
        <p className="m-0 text-dust">Pick your hand and position first.</p>
      ) : !line.ok ? (
        <p className="m-0 text-dust">{line.reason}</p>
      ) : board.length < 3 ? (
        <p className="m-0 text-dust">Add the flop for your postflop numbers.</p>
      ) : (
        <PostflopInputs setup={setup} line={line.line} update={update} />
      )}

      {picking && (
        <CardKeypadSheet
          title="Board"
          value={board}
          max={5}
          unavailable={setup.hand}
          onDone={(cards) => {
            update({ board: cards });
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  );
}

function PostflopInputs({ setup, line, update }: { setup: AdvisorSetup; line: PostflopLine; update: Update }) {
  const unit = setup.stack.unit === "chips" ? "chips" : "bb";
  const decimal = unit === "bb";
  const positions = opponentPositions(line);
  const opponents = (setup.opponents ?? defaultOpponents(line).map((position): Opponent => ({ position, type: "standard" }))).filter((opponent) =>
    positions.includes(opponent.position),
  );
  const setOpponents = (next: Opponent[]) => update({ opponents: [...next].sort((a, b) => positions.indexOf(a.position) - positions.indexOf(b.position)) });
  const ranges = opponents.map((opponent) => ({ opponent, result: opponentRange(line, opponent) }));

  return (
    <>
      <div className="flex gap-3">
        <NumberField className="flex-1" label="Pot before the bet" unit={unit} decimal={decimal} value={setup.pot} onChange={(pot) => update({ pot }, "replace")} />
        <NumberField
          className="flex-1"
          label="Bet to call"
          unit={unit}
          decimal={decimal}
          allowZero
          placeholder="0"
          value={setup.bet}
          onChange={(bet) => update({ bet }, "replace")}
        />
      </div>

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-1.5 p-0 text-dust">Still in the hand</legend>
        <div className="flex flex-wrap gap-1">
          {positions.map((position) => {
            const index = opponents.findIndex((opponent) => opponent.position === position);
            return (
              <button
                key={position}
                type="button"
                aria-pressed={index >= 0}
                disabled={index < 0 && opponents.length >= MAX_OPPONENTS}
                onClick={() => setOpponents(index >= 0 ? opponents.filter((_, i) => i !== index) : [...opponents, { position, type: "standard" }])}
                className="h-11 min-w-14 rounded-xl bg-booth px-2 font-bold font-display text-lg leading-none focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2 disabled:opacity-35 aria-pressed:bg-chalk aria-pressed:text-night"
              >
                {position}
              </button>
            );
          })}
        </div>
      </fieldset>

      {ranges.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {ranges.map(({ opponent, result }, index) => (
            <li key={opponent.position} className="rounded-2xl border-2 border-booth p-4">
              <p className="m-0 mb-2">
                <span className="font-bold font-display text-2xl">{opponent.position}</span>
                {result.ok && <span className="text-dust">{`, ${result.line}`}</span>}
              </p>
              <Segmented
                legend={`${opponent.position}'s player type`}
                options={PLAYER_TYPES.map((type) => ({ label: PLAYER_TYPE_LABELS[type], value: type }))}
                value={opponent.type}
                onChange={(type) => setOpponents(opponents.map((other, i) => (i === index ? { ...other, type } : other)))}
              />
              {!result.ok && <p className="m-0 mt-2 text-raise">{result.error}</p>}
              {result.ok && result.note && <p className="m-0 mt-2 text-dust text-sm">{result.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {opponents.length === 0 ? (
        <p className="m-0 text-dust">Tap the players still in the hand.</p>
      ) : ranges.every((entry) => entry.result.ok) ? (
        <PostflopResults
          setup={setup}
          line={line}
          opponents={ranges.map(({ opponent, result }) => ({ position: opponent.position, range: (result as { range: Range }).range, type: opponent.type }))}
        />
      ) : null}
    </>
  );
}

type RangedOpponent = Opponent & { range: Range };

/** Results worth showing: final ones, or live Monte Carlo estimates (partial exact counts are biased). */
function visibleResult(run: EquityRun): EquityResult | null {
  if (run.status === "done") return run.result;
  if (run.status === "running" && run.result?.method === "monte-carlo") return run.result;
  return null;
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-dust">{label}</dt>
      <dd className="m-0 font-display font-extrabold text-3xl leading-none">{value}</dd>
    </div>
  );
}

function PostflopResults({ setup, line, opponents }: { setup: AdvisorSetup; line: PostflopLine; opponents: RangedOpponent[] }) {
  const hand = setup.hand as CardId[];
  const input: EquityInput = { board: setup.board, dead: [], players: [{ cards: hand, kind: "hand" }, ...opponents.map(({ range }) => ({ kind: "range" as const, range }))] };
  const key = JSON.stringify([hand, setup.board, opponents.map(({ position, type }) => [position, type]), line.key, line.heroAction]);
  const run = useEquity(input, key);
  const result = visibleResult(run);
  const equity = result?.players[0]?.equity ?? null;

  const stack = setup.stack.unit === "chips" ? setup.stack.chips : setup.stack.bb;
  const { pot } = setup;
  const bet = setup.bet ?? 0;
  const amounts = pot !== null && stack !== null ? { bet, pot, stack } : null;
  const numbers = amounts ? postflopNumbers(amounts) : null;
  const verdict = amounts && equity !== null && run.status === "done" ? postflopVerdict({ ...amounts, equity, opponents: opponents.length }) : null;

  const status =
    run.status === "error"
      ? run.message
      : !result
        ? "Calculating…"
        : `${result.method === "exact" ? `Exact, ${count(result.samples)} runouts` : `Monte Carlo, ${count(result.samples)} samples`} vs ${opponents.map(({ position, type }) => `${position} ${PLAYER_TYPE_LABELS[type]}`).join(", ")}`;

  const opponent = opponents.length === 1 ? opponents[0] : null;
  const level = setup.stack.unit === "chips" ? setup.stack.level : undefined;
  const solver =
    opponent && amounts
      ? solverHref(solverLinkFor({ board: setup.board, hand, level, line, opponent, pot: toUnit(amounts.pot, setup.stack), stack: toUnit(amounts.stack, setup.stack) }))
      : null;

  return (
    <div className="flex flex-col gap-4">
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
        <Figure label="Your equity" value={equity === null ? "–" : percent(equity)} />
        <Figure label="SPR" value={numbers ? numbers.spr.toFixed(1) : "–"} />
        <Figure label="Pot odds" value={numbers && numbers.call > 0 ? `${numbers.potOdds.toFixed(1)} : 1` : "–"} />
        <Figure label="Equity needed" value={numbers && numbers.call > 0 ? percent(numbers.requiredEquity) : "–"} />
      </dl>
      <p className={`m-0 ${run.status === "error" ? "text-raise" : "text-dust"}`} aria-live="polite">
        {status}
      </p>

      <VerdictCard
        label="Heuristic"
        verdict={verdict && { aside: "Heuristic: equity vs estimated Ranges, not a solve", colour: VERDICT_COLOURS[verdict.kind], detail: verdict.reason, title: verdict.title }}
        prompt={amounts ? "Calculating…" : "Enter the pot"}
        flipKey={verdict?.kind ?? ""}
      />

      {solver ? (
        <div>
          <Link href={solver} className={`inline-flex items-center ${primaryButton}`}>
            Open in Solver
          </Link>
        </div>
      ) : (
        opponent === null && <p className="m-0 text-dust">The Solver takes heads-up Spots: keep one opponent to open this in the Solver.</p>
      )}
    </div>
  );
}
