"use client";

import Link from "next/link";
import { useState } from "react";
import { primaryButton, textButton } from "@/components/buttons";
import { CardKeypadSheet } from "@/components/card-keypad-sheet";
import { Segmented } from "@/components/chart-picker";
import { useI18n } from "@/components/i18n-provider";
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
import { PLAYER_TYPES } from "@/lib/charts/player-types";
import type { EquityInput, EquityResult } from "@/lib/equity/engine";
import { type EquityRun, useEquity } from "@/lib/equity/use-equity";
import { type CardId, cardFromId } from "@/lib/poker/card";
import type { Range } from "@/lib/poker/range";
import { solverHref } from "@/lib/solver/spot-url";
import type { Update } from "./advisor-tool";

const VERDICT_COLOURS: Record<PostflopVerdictKind, ActionColour> = { bet: "raise", call: "call", check: "call", fold: "fold", push: "push" };
const MAX_OPPONENTS = 7;

type Props = { setup: AdvisorSetup; question: PreflopQuestion | null; advice: PreflopAdvice | null; update: Update };

export function AdvisorPostflop({ setup, question, advice, update }: Props) {
  const { locale, t } = useI18n();
  const [picking, setPicking] = useState(false);
  const { board } = setup;
  const line = question && advice ? postflopLine(question, advice, locale) : null;

  return (
    <section aria-labelledby="postflop-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="postflop-heading" className="m-0 font-bold font-display text-3xl leading-none">
          {t.postflop.heading}
        </h2>
        {board.length > 0 && (
          <button type="button" onClick={() => update({ board: [] })} className={`-mr-4 ${textButton}`}>
            {t.common.clear}
            <span className="sr-only">{t.common.boardSr}</span>
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setPicking(true)}
        className="flex flex-wrap gap-2 self-start rounded-lg focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3"
      >
        <span className="sr-only">{board.length > 0 ? t.common.editBoard : t.common.addBoard}</span>
        {Array.from({ length: 5 }, (_, i) => (
          <PlayingCard key={i} card={board[i] === undefined ? null : cardFromId(board[i])} size="md" />
        ))}
      </button>

      {!line ? (
        <p className="m-0 text-dust">{t.postflop.handFirst}</p>
      ) : !line.ok ? (
        <p className="m-0 text-dust">{line.reason}</p>
      ) : board.length < 3 ? (
        <p className="m-0 text-dust">{t.postflop.addFlop}</p>
      ) : (
        <PostflopInputs setup={setup} line={line.line} update={update} />
      )}

      {picking && (
        <CardKeypadSheet
          title={t.common.board}
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
  const { locale, t } = useI18n();
  const decimal = setup.stack.unit === "bb";
  const unit = decimal ? "bb" : t.advisor.chips;
  const positions = opponentPositions(line);
  const opponents = (setup.opponents ?? defaultOpponents(line).map((position): Opponent => ({ position, type: "standard" }))).filter((opponent) =>
    positions.includes(opponent.position),
  );
  const setOpponents = (next: Opponent[]) => update({ opponents: [...next].sort((a, b) => positions.indexOf(a.position) - positions.indexOf(b.position)) });
  const ranges = opponents.map((opponent) => ({ opponent, result: opponentRange(line, opponent, locale) }));

  return (
    <>
      <div className="flex gap-3">
        <NumberField className="flex-1" label={t.postflop.pot} unit={unit} decimal={decimal} value={setup.pot} onChange={(pot) => update({ pot }, "replace")} />
        <NumberField
          className="flex-1"
          label={t.postflop.bet}
          unit={unit}
          decimal={decimal}
          allowZero
          placeholder="0"
          value={setup.bet}
          onChange={(bet) => update({ bet }, "replace")}
        />
      </div>

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-1.5 p-0 text-dust">{t.postflop.stillIn}</legend>
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
                legend={t.postflop.playerType(opponent.position)}
                options={PLAYER_TYPES.map((type) => ({ label: t.charts.playerTypes[type], value: type }))}
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
        <p className="m-0 text-dust">{t.postflop.tapPlayers}</p>
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
  const { locale, t, href } = useI18n();
  const hand = setup.hand as CardId[];
  const input: EquityInput = { board: setup.board, dead: [], players: [{ cards: hand, kind: "hand" }, ...opponents.map(({ range }) => ({ kind: "range" as const, range }))] };
  const key = JSON.stringify([hand, setup.board, opponents.map(({ position, type }) => [position, type]), line.key, line.heroAction]);
  const run = useEquity(input, key, locale);
  const result = visibleResult(run);
  const equity = result?.players[0]?.equity ?? null;

  const stack = setup.stack.unit === "chips" ? setup.stack.chips : setup.stack.bb;
  const { pot } = setup;
  const bet = setup.bet ?? 0;
  const amounts = pot !== null && stack !== null ? { bet, pot, stack } : null;
  const numbers = amounts ? postflopNumbers(amounts) : null;
  const verdict = amounts && equity !== null && run.status === "done" ? postflopVerdict({ ...amounts, equity, opponents: opponents.length }, locale) : null;

  const status =
    run.status === "error"
      ? run.message
      : !result
        ? t.common.calculating
        : t.postflop.versus(
            result.method === "exact" ? t.postflop.exact(result.samples) : t.postflop.monteCarlo(result.samples),
            opponents.map(({ position, type }) => `${position} ${t.charts.playerTypes[type]}`),
          );

  const opponent = opponents.length === 1 ? opponents[0] : null;
  const level = setup.stack.unit === "chips" ? setup.stack.level : undefined;
  const solver =
    opponent && amounts
      ? href(solverHref(solverLinkFor({ board: setup.board, hand, level, line, opponent, pot: toUnit(amounts.pot, setup.stack), stack: toUnit(amounts.stack, setup.stack) })))
      : null;

  return (
    <div className="flex flex-col gap-4">
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
        <Figure label={t.postflop.yourEquity} value={equity === null ? "–" : t.equity.percent(equity)} />
        <Figure label={t.postflop.spr} value={numbers ? t.postflop.ratio(numbers.spr) : "–"} />
        <Figure label={t.postflop.potOdds} value={numbers && numbers.call > 0 ? t.postflop.odds(numbers.potOdds) : "–"} />
        <Figure label={t.postflop.equityNeeded} value={numbers && numbers.call > 0 ? t.equity.percent(numbers.requiredEquity) : "–"} />
      </dl>
      <p className={`m-0 ${run.status === "error" ? "text-raise" : "text-dust"}`} aria-live="polite">
        {status}
      </p>

      <VerdictCard
        label={t.postflop.heuristic}
        verdict={verdict && { aside: t.postflop.heuristicAside, colour: VERDICT_COLOURS[verdict.kind], detail: verdict.reason, title: verdict.title }}
        prompt={amounts ? t.common.calculating : t.postflop.enterPot}
        flipKey={verdict?.kind ?? ""}
      />

      {solver ? (
        <div>
          <Link href={solver} className={`inline-flex items-center ${primaryButton}`}>
            {t.postflop.openInSolver}
          </Link>
        </div>
      ) : (
        opponent === null && <p className="m-0 text-dust">{t.postflop.headsUpOnly}</p>
      )}
    </div>
  );
}
