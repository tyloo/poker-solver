"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { outlineButton, primaryButton, textButton } from "@/components/buttons";
import { CardKeypadSheet } from "@/components/card-keypad-sheet";
import { useI18n } from "@/components/i18n-provider";
import { LoadRangeButton } from "@/components/load-range-sheet";
import { PlayingCard } from "@/components/playing-card";
import { RangeSheet, rangeSummary } from "@/components/range-sheet";
import { formatBb } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/messages";
import { rangeErrorText } from "@/lib/i18n/range";
import { describeLine, setupProblemText, solverErrorText } from "@/lib/i18n/solver";
import { type CardId, cardFromId } from "@/lib/poker/card";
import { comboId, HAND_CLASS_NAMES, handClassOfCombo } from "@/lib/poker/combo";
import { parseRange } from "@/lib/poker/range";
import { overBudget } from "@/lib/solver/estimate";
import type { SolveStatus } from "@/lib/solver/protocol";
import { BET_SIZE_OPTIONS, betSizesFor, resolveSetup } from "@/lib/solver/spot-setup";
import { parseSpotParams, type SpotSetup, spotParams, TREE_PATH_PARAM } from "@/lib/solver/spot-url";
import { type SolveRun, useSolver } from "@/lib/solver/use-solver";
import { setUrlParams } from "@/lib/url-state";
import { AmountsSheet, describeLevel, LineSheet } from "./setup-sheets";
import { Strategy } from "./strategy";

type OpenSheet = { kind: "line" | "amounts" | "board" | "hand" } | { kind: "range"; player: 0 | 1 } | null;

const RAISE_OPTIONS = [2.5, 3, 4] as const;
const CONTINUE_ITERATIONS = 1000;

const chipButton =
  "h-11 min-w-0 flex-1 rounded-xl bg-booth px-0.5 font-bold font-display text-lg leading-none focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2 aria-pressed:bg-chalk aria-pressed:text-night";
const sectionHeading = "m-0 font-bold font-display text-3xl leading-none";

const bb = (value: number, locale: Locale) => (Number.isNaN(value) ? "?" : formatBb(value, locale));

function runText(run: SolveRun, players: readonly [string, string], locale: Locale, t: Messages["solver"]): string {
  if (run.status === "idle") return "";
  if (run.status === "error") return solverErrorText(run.error, players, locale);
  const { progress } = run;
  if (!progress) return run.estimate ? t.building : t.starting;
  const { iteration, elapsedMs, exploitabilityShare: share } = progress;
  if (run.status === "running") return share === null ? t.measuring(iteration) : t.running(iteration, share, elapsedMs);
  if (run.reason === "converged") return t.converged(share, iteration, elapsedMs);
  if (run.reason === "stopped") return t.stopped(share, iteration, elapsedMs);
  return t.maxIterations(iteration, share);
}

function CardRow({ cards, slots, label, onEdit }: { cards: readonly CardId[]; slots: number; label: string; onEdit: () => void }) {
  return (
    <button type="button" onClick={onEdit} className="flex flex-wrap gap-2 rounded-lg focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: Math.max(slots, cards.length) }, (_, i) => (
        <PlayingCard key={i} card={cards[i] === undefined ? null : cardFromId(cards[i])} size="md" />
      ))}
    </button>
  );
}

function ProgressMeter({ progress }: { progress: SolveStatus | null }) {
  // Exploitability falls roughly geometrically, so the bar runs on a log scale from 50% down to the 0.5% target.
  const value = progress?.exploitabilityShare ? Math.min(1, Math.max(0, Math.log(0.5 / progress.exploitabilityShare) / Math.log(100))) : 0;
  return (
    <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-booth">
      <div className="h-full rounded-full bg-call" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

export function SolverTool() {
  const { locale, t } = useI18n();
  const text = t.solver;
  const params = useSearchParams();
  const setup = parseSpotParams(params);
  const resolved = resolveSetup(setup);
  const solver = useSolver(resolved.spot, resolved.key);
  const { run, estimate } = solver;
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [solveCount, setSolveCount] = useState(0);
  const [browsable, setBrowsable] = useState(0);

  // Changing the Spot makes the tree path stale: it belongs to the last Spot solved. The hero's hand is not part of the Spot.
  const update = (fields: Partial<SpotSetup>, history: "push" | "replace" = "push") =>
    setUrlParams({ ...spotParams(fields), ...(Object.keys(fields).some((name) => name !== "hand") && { [TREE_PATH_PARAM]: null }) }, history);
  const close = () => setSheet(null);

  const { players, street } = resolved;
  const hand = setup.hand.length === 2 ? setup.hand : null;
  const heroClass = hand ? handClassOfCombo(comboId(hand[0], hand[1])) : null;
  const running = run.status === "running";
  const stale = run.status !== "idle" && run.key !== resolved.key;
  const fits = estimate?.ok === true && estimate.estimate.fits;
  if (run.status === "done" && browsable !== solveCount) setBrowsable(solveCount);

  const solve = () => {
    setSolveCount(solveCount + 1);
    solver.solve();
  };

  const toggleBet = (size: number) => {
    const current = resolved.bets;
    let next: number[];
    if (street === "flop") next = [size];
    else if (current.includes(size)) next = current.length > 1 ? current.filter((value) => value !== size) : current;
    else next = [...current, size];
    const defaults = betSizesFor(null, setup.board.length);
    update({ bets: next.length === defaults.length && next.every((value) => defaults.includes(value)) ? null : next }, "replace");
  };

  return (
    <>
      <section aria-labelledby="line-heading" className="rounded-2xl bg-booth p-4">
        <h2 id="line-heading" className="m-0 font-bold font-display text-2xl leading-none">
          {text.lineHeading}
        </h2>
        <button
          type="button"
          onClick={() => setSheet({ kind: "line" })}
          className="mt-2 block w-full rounded-lg text-left font-bold underline decoration-2 underline-offset-4 focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3"
        >
          <span className="sr-only">{text.changeLineSr}</span>
          {setup.line ? text.lineWithLevel(describeLine(setup.line, setup.depth, locale), describeLevel(setup.level, locale)) : text.noLine}
        </button>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="m-0 text-dust">
            {text.amounts(bb(resolved.pot, locale), bb(resolved.stack, locale))}
            {resolved.pot > 0 && resolved.stack >= 0 && text.spr(resolved.stack / resolved.pot)}
          </p>
          <button type="button" onClick={() => setSheet({ kind: "amounts" })} className={`-mr-4 shrink-0 ${textButton}`}>
            {t.common.edit}
            <span className="sr-only">{text.amountsSr}</span>
          </button>
        </div>
      </section>

      <section aria-labelledby="ranges-heading" className="mt-8">
        <h2 id="ranges-heading" className={`${sectionHeading} mb-3`}>
          {text.ranges}
        </h2>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {([0, 1] as const).map((player) => {
            const parsed = parseRange(resolved.rangeTexts[player]);
            const edited = setup.ranges[player] !== null && setup.line !== null;
            return (
              <li key={player}>
                <button
                  type="button"
                  onClick={() => setSheet({ kind: "range", player })}
                  className="block w-full rounded-2xl bg-booth p-4 text-left focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-bold font-display text-2xl leading-none">{text.side(players[player], player)}</span>
                    <span className="text-dust text-sm">{setup.ranges[player] === null ? text.fromCharts : edited ? text.edited : ""}</span>
                  </span>
                  <span className="mt-2 line-clamp-2 block break-words">{resolved.rangeTexts[player] || t.common.paintRange}</span>
                  <span className="block text-dust">{parsed.ok ? rangeSummary(parsed.range, locale) : rangeErrorText(parsed.error, locale)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="board-heading" className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="board-heading" className={sectionHeading}>
            {t.common.board}
          </h2>
          {setup.board.length > 0 && (
            <button type="button" onClick={() => update({ board: [] })} className={`-mr-4 ${textButton}`}>
              {t.common.clear}
              <span className="sr-only">{t.common.boardSr}</span>
            </button>
          )}
        </div>
        <CardRow cards={setup.board} slots={4} label={setup.board.length > 0 ? t.common.editBoard : t.common.addBoard} onEdit={() => setSheet({ kind: "board" })} />
        {street === "flop" && (
          <p role="note" className="mt-4 mb-0 rounded-2xl border-2 border-push px-4 py-3">
            {text.flopWarning}
          </p>
        )}
      </section>

      <section aria-labelledby="hand-heading" className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="hand-heading" className={sectionHeading}>
            {t.common.yourHand}
          </h2>
          {hand && (
            <button type="button" onClick={() => update({ hand: [] })} className={`-mr-4 ${textButton}`}>
              {t.common.clear}
              <span className="sr-only">{text.handSr}</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <CardRow cards={setup.hand} slots={2} label={hand ? text.editHand : text.addHand} onEdit={() => setSheet({ kind: "hand" })} />
          <p className="m-0 text-dust">{heroClass === null ? text.handOptional : text.opensOn(HAND_CLASS_NAMES[heroClass])}</p>
        </div>
      </section>

      <section aria-labelledby="sizes-heading" className="mt-8">
        <h2 id="sizes-heading" className={`${sectionHeading} mb-3`}>
          {text.betSizes}
        </h2>
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-1.5 p-0 text-dust">{street === "flop" ? text.flopBets : text.bets}</legend>
          <div className="flex gap-1">
            {BET_SIZE_OPTIONS.map((size) => (
              <button key={size} type="button" aria-pressed={resolved.bets.includes(size)} onClick={() => toggleBet(size)} className={chipButton}>
                {text.betSize(size)}
              </button>
            ))}
          </div>
        </fieldset>
        {street === "flop" ? (
          <p className="mt-3 mb-0 text-dust">{text.flopRaises}</p>
        ) : (
          <fieldset className="m-0 mt-4 min-w-0 border-0 p-0">
            <legend className="mb-1.5 p-0 text-dust">{text.raises}</legend>
            <div className="flex gap-1">
              {RAISE_OPTIONS.map((size) => (
                <button key={size} type="button" aria-pressed={setup.raise === size} onClick={() => update({ raise: size }, "replace")} className={chipButton}>
                  {text.times(size)}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </section>

      <section aria-labelledby="solve-heading" className="mt-8">
        <h2 id="solve-heading" className="sr-only">
          {text.solveSr}
        </h2>
        <p className={`m-0 ${resolved.reason || (estimate && (!estimate.ok || !estimate.estimate.fits)) ? "text-raise" : "text-dust"}`}>
          {resolved.reason
            ? setupProblemText(resolved.reason, players, locale)
            : estimate === null
              ? text.sizing
              : !estimate.ok
                ? solverErrorText(estimate.error, players, locale)
                : estimate.estimate.fits
                  ? text.estimate(estimate.estimate.actionNodes, estimate.estimate.memoryBytes, estimate.estimate.combos[0], estimate.estimate.combos[1])
                  : resolved.spot && solverErrorText(overBudget(estimate.estimate, resolved.spot), players, locale)}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {running ? (
            <button type="button" onClick={solver.stop} className={outlineButton}>
              {t.common.stop}
            </button>
          ) : (
            <button type="button" disabled={!resolved.spot || !fits} onClick={solve} className={primaryButton}>
              {run.status === "idle" ? text.solve : text.solveAgain}
            </button>
          )}
          {run.status === "done" && run.reason !== "converged" && !stale && (
            <button type="button" onClick={() => solver.resume({ maxIterations: run.progress.iteration + CONTINUE_ITERATIONS })} className={outlineButton}>
              {text.continue}
            </button>
          )}
        </div>

        {run.status !== "idle" && (
          <div className="mt-4">
            <p role="status" className={`m-0 ${run.status === "error" ? "text-raise" : ""}`}>
              {runText(run, players, locale, text)}
            </p>
            {running && <ProgressMeter progress={run.progress} />}
            {stale && run.status !== "error" && <p className="mt-2 mb-0 text-dust">{text.stale}</p>}
          </div>
        )}
      </section>

      {browsable > 0 && browsable === solveCount && run.status !== "error" && (
        <Strategy
          key={solveCount}
          query={solver.query}
          players={stale ? ["OOP", "IP"] : players}
          version={run.status === "done" ? String(run.progress.iteration) : "running"}
          heroClass={heroClass}
        />
      )}

      {sheet?.kind === "line" && (
        <LineSheet
          line={setup.line}
          depth={setup.depth}
          level={setup.level}
          onDone={(line, depth, level) => {
            update({ depth, level, line, pot: null, ranges: [null, null], stack: null });
            close();
          }}
          onClose={close}
        />
      )}
      {sheet?.kind === "amounts" && (
        <AmountsSheet
          pot={resolved.pot}
          stack={resolved.stack}
          canReset={setup.line !== null && (setup.pot !== null || setup.stack !== null)}
          onDone={(pot, stack) => {
            update({ pot, stack });
            close();
          }}
          onReset={() => {
            update({ pot: null, stack: null });
            close();
          }}
          onClose={close}
        />
      )}
      {sheet?.kind === "range" && (
        <RangeSheet
          title={text.rangeSheet(players[sheet.player])}
          value={resolved.rangeTexts[sheet.player]}
          load={(apply) => <LoadRangeButton onLoad={apply} />}
          onDone={(text) => {
            update({ ranges: sheet.player === 0 ? [text, setup.ranges[1]] : [setup.ranges[0], text] });
            close();
          }}
          onClose={close}
        />
      )}
      {sheet?.kind === "board" && (
        <CardKeypadSheet
          title={t.common.board}
          value={setup.board}
          max={5}
          unavailable={setup.hand}
          onDone={(cards) => {
            update({ board: cards });
            close();
          }}
          onClose={close}
        />
      )}
      {sheet?.kind === "hand" && (
        <CardKeypadSheet
          title={t.common.yourHand}
          value={setup.hand}
          max={2}
          unavailable={setup.board}
          onDone={(cards) => {
            update({ hand: cards.length === 2 ? cards : [] });
            close();
          }}
          onClose={close}
        />
      )}
    </>
  );
}
