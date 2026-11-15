"use client";

import { useState } from "react";
import { outlineButton, textButton } from "@/components/buttons";
import { CardKeypadSheet } from "@/components/card-keypad-sheet";
import { useI18n } from "@/components/i18n-provider";
import { LoadRangeButton } from "@/components/load-range-sheet";
import { PlayingCard } from "@/components/playing-card";
import { RangeSheet, rangeSummary } from "@/components/range-sheet";
import type { EquityResult, PlayerEquity } from "@/lib/equity/engine";
import { MAX_PLAYERS } from "@/lib/equity/engine";
import { boardCodec, deadCodec, MAX_DEAD_CARDS, playersCodec, type SetupPlayer, toEquityInput } from "@/lib/equity/setup";
import { type EquityRun, useEquity } from "@/lib/equity/use-equity";
import type { Locale } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/messages";
import { type CardId, cardFromId } from "@/lib/poker/card";
import { formatRange, parseRange } from "@/lib/poker/range";
import { useUrlState } from "@/lib/url-state";

type OpenSheet = { kind: "hand" | "range"; player: number } | { kind: "board" | "dead" } | null;

const KINDS = ["hand", "range", "random"] as const;

function statusText(run: EquityRun, missing: string | null, t: Messages): string {
  if (missing) return missing;
  if (run.status === "error") return run.message;
  if (run.status !== "done" && run.status !== "running") return "";
  const { result } = run;
  if (!result) return t.common.calculating;
  if (run.status === "running") {
    return result.method === "exact" ? t.equity.counting(Math.floor(result.progress * 100) / 100) : t.equity.sampling(result.samples);
  }
  return result.method === "exact" ? t.equity.exact(result.samples) : t.equity.monteCarlo(result.samples);
}

/** Results worth showing: final ones, or live Monte Carlo estimates (partial exact counts are biased). */
function visibleResult(run: EquityRun): EquityResult | null {
  if (run.status === "done") return run.result;
  if (run.status === "running" && run.result?.method === "monte-carlo") return run.result;
  return null;
}

function rangeLabel(text: string, locale: Locale): { name: string; summary: string } | null {
  const parsed = parseRange(text);
  if (!parsed.ok || !parsed.range.some((weight) => weight > 0)) return null;
  return { name: formatRange(parsed.range), summary: rangeSummary(parsed.range, locale) };
}

function PlayerValue({ player, index, onEdit }: { player: SetupPlayer; index: number; onEdit: () => void }) {
  const { locale, t } = useI18n();
  const editClass = "rounded-lg text-left focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3";
  if (player.kind === "random") return <p className="m-0 flex h-14 items-center text-dust">{t.equity.anyTwo}</p>;
  if (player.kind === "hand") {
    const [first, second] = [player.cards[0], player.cards[1]];
    return (
      <button type="button" onClick={onEdit} className={`flex items-center gap-3 ${editClass}`}>
        <span className="sr-only">{t.equity.editHand(index)}</span>
        <PlayingCard card={first === undefined ? null : cardFromId(first)} size="sm" />
        <PlayingCard card={second === undefined ? null : cardFromId(second)} size="sm" />
        {player.cards.length < 2 && <span className="font-bold text-dust underline decoration-2 underline-offset-4">{t.equity.pickCards}</span>}
      </button>
    );
  }
  const label = rangeLabel(player.range, locale);
  return (
    <button type="button" onClick={onEdit} className={`block min-h-14 w-full ${editClass}`}>
      <span className="sr-only">{t.equity.editRange(index)}</span>
      {label ? (
        <>
          <span className="line-clamp-2 block break-words font-bold">{label.name}</span>
          <span className="block text-dust">{label.summary}</span>
        </>
      ) : (
        <span className="flex h-14 items-center font-bold text-dust underline decoration-2 underline-offset-4">{t.common.paintRange}</span>
      )}
    </button>
  );
}

function PlayerRow(props: {
  player: SetupPlayer;
  index: number;
  equity: PlayerEquity | null;
  canRemove: boolean;
  onKind: (kind: SetupPlayer["kind"]) => void;
  onOpen: (kind: "hand" | "range") => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const { player, index, equity } = props;
  const name = t.equity.player(index);
  return (
    <li className="rounded-2xl bg-booth p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-1">
            <h3 className="m-0 font-bold font-display text-2xl leading-none">{name}</h3>
            {props.canRemove && (
              <button type="button" onClick={props.onRemove} className={`-my-3 text-sm ${textButton}`}>
                {t.equity.remove}
                <span className="sr-only">{t.equity.removeSr(index)}</span>
              </button>
            )}
          </div>
          <PlayerValue player={player} index={index} onEdit={props.onEdit} />
        </div>
        <div className="text-right">
          {equity && <span className="sr-only">{t.equity.equitySr(equity.equity, equity.win, equity.tie)}</span>}
          <p className="m-0 font-display font-extrabold text-4xl leading-none" aria-hidden="true">
            {equity ? t.equity.percent(equity.equity) : "–"}
          </p>
          {equity && (
            <p className="m-0 mt-1 text-dust text-sm" aria-hidden="true">
              <span className="block">{t.equity.win(equity.win)}</span>
              <span className="block">{t.equity.tie(equity.tie)}</span>
            </p>
          )}
        </div>
      </div>
      <fieldset className="m-0 mt-3 flex min-w-0 rounded-full border-0 bg-night p-1">
        <legend className="sr-only">{t.equity.holds(index)}</legend>
        {KINDS.map((kind) => (
          <label key={kind} className="flex-1">
            <input
              type="radio"
              name={`player-${index}-kind`}
              checked={player.kind === kind}
              onChange={() => props.onKind(kind)}
              onClick={(event) => {
                // A tap also opens the editor; arrow keys only switch, so the sheet does not trap them.
                if (event.detail > 0 && kind !== "random") props.onOpen(kind);
              }}
              className="peer sr-only"
            />
            <span className="flex h-11 cursor-pointer items-center justify-center rounded-full font-bold text-dust peer-checked:bg-chalk peer-checked:text-night peer-focus-visible:outline-3 peer-focus-visible:outline-chalk">
              {t.equity.kinds[kind]}
            </span>
          </label>
        ))}
      </fieldset>
    </li>
  );
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

export function EquityTool() {
  const { locale, t } = useI18n();
  const [players, setPlayers] = useUrlState("players", playersCodec, "push");
  const [board, setBoard] = useUrlState("board", boardCodec, "push");
  const [dead, setDead] = useUrlState("dead", deadCodec, "push");
  const [sheet, setSheet] = useState<OpenSheet>(null);

  const prepared = toEquityInput({ board, dead, players }, locale);
  const key = [playersCodec.serialize(players), boardCodec.serialize(board), deadCodec.serialize(dead)].join("|");
  const run = useEquity(prepared.ok ? prepared.input : null, key, locale);
  const result = visibleResult(run);
  const status = statusText(run, prepared.ok ? null : prepared.reason, t);

  const handCards = (except?: number) => players.flatMap((player, i) => (player.kind === "hand" && i !== except ? player.cards : []));
  const updatePlayer = (index: number, player: SetupPlayer) => setPlayers(players.map((other, i) => (i === index ? player : other)));

  const changeKind = (index: number, kind: SetupPlayer["kind"]) => updatePlayer(index, kind === "random" ? { kind } : kind === "hand" ? { cards: [], kind } : { kind, range: "" });
  const editing = sheet?.kind === "hand" || sheet?.kind === "range" ? players[sheet.player] : undefined;

  const close = () => setSheet(null);

  return (
    <>
      <section aria-labelledby="players-heading">
        <h2 id="players-heading" className="sr-only">
          {t.equity.players}
        </h2>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {players.map((player, index) => (
            <PlayerRow
              key={index}
              player={player}
              index={index}
              equity={result?.players[index] ?? null}
              canRemove={players.length > 2}
              onKind={(kind) => changeKind(index, kind)}
              onOpen={(kind) => setSheet({ kind, player: index })}
              onEdit={() => setSheet(player.kind === "random" ? null : { kind: player.kind, player: index })}
              onRemove={() => setPlayers(players.filter((_, i) => i !== index))}
            />
          ))}
        </ol>
        <p className={`m-0 mt-3 min-h-[1.5em] ${run.status === "error" ? "text-raise" : "text-dust"}`} aria-hidden="true">
          {status}
        </p>
        <p role="status" className="sr-only">
          {run.status === "running" ? t.common.calculating : status}
        </p>
        {players.length < MAX_PLAYERS && (
          <button type="button" onClick={() => setPlayers([...players, { kind: "random" }])} className={`mt-3 ${outlineButton}`}>
            {t.equity.addPlayer}
          </button>
        )}
      </section>

      <section aria-labelledby="board-heading" className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="board-heading" className="m-0 font-bold font-display text-3xl leading-none">
            {t.common.board}
          </h2>
          {board.length > 0 && (
            <button type="button" onClick={() => setBoard([])} className={`-mr-4 ${textButton}`}>
              {t.common.clear}
              <span className="sr-only">{t.common.boardSr}</span>
            </button>
          )}
        </div>
        <CardRow cards={board} slots={5} label={board.length > 0 ? t.common.editBoard : t.common.addBoard} onEdit={() => setSheet({ kind: "board" })} />
      </section>

      <section aria-labelledby="dead-heading" className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="dead-heading" className="m-0 font-bold font-display text-3xl leading-none">
            {t.equity.dead}
          </h2>
          {dead.length > 0 && (
            <button type="button" onClick={() => setDead([])} className={`-mr-4 ${textButton}`}>
              {t.common.clear}
              <span className="sr-only">{t.equity.deadSr}</span>
            </button>
          )}
        </div>
        {dead.length > 0 ? (
          <CardRow cards={dead} slots={0} label={t.equity.editDead} onEdit={() => setSheet({ kind: "dead" })} />
        ) : (
          <button type="button" onClick={() => setSheet({ kind: "dead" })} className={`-ml-4 ${textButton}`}>
            {t.equity.addDead}
          </button>
        )}
      </section>

      {sheet?.kind === "hand" && editing?.kind === "hand" && (
        <CardKeypadSheet
          title={t.equity.handSheet(sheet.player)}
          value={editing.cards}
          max={2}
          unavailable={[...handCards(sheet.player), ...board, ...dead]}
          onDone={(cards) => {
            updatePlayer(sheet.player, { cards, kind: "hand" });
            close();
          }}
          onClose={close}
        />
      )}
      {sheet?.kind === "range" && editing?.kind === "range" && (
        <RangeSheet
          title={t.equity.rangeSheet(sheet.player)}
          value={editing.range}
          load={(apply) => <LoadRangeButton onLoad={apply} />}
          onDone={(range) => {
            updatePlayer(sheet.player, { kind: "range", range });
            close();
          }}
          onClose={close}
        />
      )}
      {sheet?.kind === "board" && (
        <CardKeypadSheet
          title={t.common.board}
          value={board}
          max={5}
          unavailable={[...handCards(), ...dead]}
          onDone={(cards) => {
            setBoard(cards);
            close();
          }}
          onClose={close}
        />
      )}
      {sheet?.kind === "dead" && (
        <CardKeypadSheet
          title={t.equity.dead}
          value={dead}
          max={MAX_DEAD_CARDS}
          unavailable={[...handCards(), ...board]}
          onDone={(cards) => {
            setDead(cards);
            close();
          }}
          onClose={close}
        />
      )}
    </>
  );
}
