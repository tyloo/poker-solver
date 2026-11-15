"use client";

import { useState } from "react";
import { CardKeypadSheet } from "@/components/card-keypad-sheet";
import { LoadRangeButton } from "@/components/load-range-sheet";
import { PlayingCard } from "@/components/playing-card";
import { RangeSheet, rangeSummary } from "@/components/range-sheet";
import type { EquityResult, PlayerEquity } from "@/lib/equity/engine";
import { MAX_PLAYERS } from "@/lib/equity/engine";
import { boardCodec, deadCodec, MAX_DEAD_CARDS, playersCodec, type SetupPlayer, toEquityInput } from "@/lib/equity/setup";
import { type EquityRun, useEquity } from "@/lib/equity/use-equity";
import { type CardId, cardFromId } from "@/lib/poker/card";
import { formatRange, parseRange } from "@/lib/poker/range";
import { useUrlState } from "@/lib/url-state";

type OpenSheet = { kind: "hand" | "range"; player: number } | { kind: "board" | "dead" } | null;

const KINDS = [
  { kind: "hand", label: "Hand" },
  { kind: "range", label: "Range" },
  { kind: "random", label: "Random" },
] as const;

const textButton = "h-12 rounded-full px-4 font-bold text-dust underline decoration-2 underline-offset-4 hover:text-chalk focus-visible:outline-3 focus-visible:outline-chalk";
const percent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;
const count = (value: number) => value.toLocaleString("en-US");

function statusText(run: EquityRun, missing: string | null): string {
  if (missing) return missing;
  if (run.status === "error") return run.message;
  if (run.status !== "done" && run.status !== "running") return "";
  const { result } = run;
  if (!result) return "Calculating…";
  if (run.status === "running") {
    return result.method === "exact" ? `Counting every runout… ${Math.floor(result.progress * 100)}%` : `Monte Carlo, ${count(result.samples)} samples so far…`;
  }
  return result.method === "exact" ? `Exact, ${count(result.samples)} runouts` : `Monte Carlo, ${count(result.samples)} samples`;
}

/** Results worth showing: final ones, or live Monte Carlo estimates (partial exact counts are biased). */
function visibleResult(run: EquityRun): EquityResult | null {
  if (run.status === "done") return run.result;
  if (run.status === "running" && run.result?.method === "monte-carlo") return run.result;
  return null;
}

function rangeLabel(text: string): { name: string; summary: string } | null {
  const parsed = parseRange(text);
  if (!parsed.ok || !parsed.range.some((weight) => weight > 0)) return null;
  return { name: formatRange(parsed.range), summary: rangeSummary(parsed.range) };
}

function PlayerValue({ player, index, onEdit }: { player: SetupPlayer; index: number; onEdit: () => void }) {
  const name = `Player ${index + 1}`;
  const editClass = "rounded-lg text-left focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3";
  if (player.kind === "random") return <p className="m-0 flex h-14 items-center text-dust">Any two cards</p>;
  if (player.kind === "hand") {
    const [first, second] = [player.cards[0], player.cards[1]];
    return (
      <button type="button" onClick={onEdit} className={`flex items-center gap-3 ${editClass}`}>
        <span className="sr-only">{`Edit ${name}'s hand: `}</span>
        <PlayingCard card={first === undefined ? null : cardFromId(first)} size="sm" />
        <PlayingCard card={second === undefined ? null : cardFromId(second)} size="sm" />
        {player.cards.length < 2 && <span className="font-bold text-dust underline decoration-2 underline-offset-4">Pick cards</span>}
      </button>
    );
  }
  const label = rangeLabel(player.range);
  return (
    <button type="button" onClick={onEdit} className={`block min-h-14 w-full ${editClass}`}>
      <span className="sr-only">{`Edit ${name}'s range: `}</span>
      {label ? (
        <>
          <span className="line-clamp-2 block break-words font-bold">{label.name}</span>
          <span className="block text-dust">{label.summary}</span>
        </>
      ) : (
        <span className="flex h-14 items-center font-bold text-dust underline decoration-2 underline-offset-4">Paint a range</span>
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
  const { player, index, equity } = props;
  const name = `Player ${index + 1}`;
  return (
    <li className="rounded-2xl bg-booth p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-1">
            <h3 className="m-0 font-bold font-display text-2xl leading-none">{name}</h3>
            {props.canRemove && (
              <button
                type="button"
                onClick={props.onRemove}
                className="-my-3 h-11 rounded-full px-3 text-dust text-sm underline decoration-2 underline-offset-4 hover:text-chalk focus-visible:outline-3 focus-visible:outline-chalk"
              >
                Remove<span className="sr-only">{` ${name}`}</span>
              </button>
            )}
          </div>
          <PlayerValue player={player} index={index} onEdit={props.onEdit} />
        </div>
        <div className="text-right">
          {equity && <span className="sr-only">{`Equity ${percent(equity.equity)}, win ${percent(equity.win)}, tie ${percent(equity.tie)}`}</span>}
          <p className="m-0 font-display font-extrabold text-4xl leading-none" aria-hidden="true">
            {equity ? percent(equity.equity) : "–"}
          </p>
          {equity && (
            <p className="m-0 mt-1 text-dust text-sm" aria-hidden="true">
              <span className="block">Win {percent(equity.win)}</span>
              <span className="block">Tie {percent(equity.tie)}</span>
            </p>
          )}
        </div>
      </div>
      <fieldset className="m-0 mt-3 flex min-w-0 rounded-full border-0 bg-night p-1">
        <legend className="sr-only">{`${name} holds`}</legend>
        {KINDS.map(({ kind, label }) => (
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
            <span className="flex h-10 cursor-pointer items-center justify-center rounded-full font-bold text-dust peer-checked:bg-chalk peer-checked:text-night peer-focus-visible:outline-3 peer-focus-visible:outline-chalk">
              {label}
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
  const [players, setPlayers] = useUrlState("players", playersCodec, "push");
  const [board, setBoard] = useUrlState("board", boardCodec, "push");
  const [dead, setDead] = useUrlState("dead", deadCodec, "push");
  const [sheet, setSheet] = useState<OpenSheet>(null);

  const prepared = toEquityInput({ board, dead, players });
  const key = [playersCodec.serialize(players), boardCodec.serialize(board), deadCodec.serialize(dead)].join("|");
  const run = useEquity(prepared.ok ? prepared.input : null, key);
  const result = visibleResult(run);
  const status = statusText(run, prepared.ok ? null : prepared.reason);

  const handCards = (except?: number) => players.flatMap((player, i) => (player.kind === "hand" && i !== except ? player.cards : []));
  const updatePlayer = (index: number, player: SetupPlayer) => setPlayers(players.map((other, i) => (i === index ? player : other)));

  const changeKind = (index: number, kind: SetupPlayer["kind"]) => updatePlayer(index, kind === "random" ? { kind } : kind === "hand" ? { cards: [], kind } : { kind, range: "" });
  const editing = sheet?.kind === "hand" || sheet?.kind === "range" ? players[sheet.player] : undefined;

  const close = () => setSheet(null);

  return (
    <>
      <section aria-labelledby="players-heading">
        <h2 id="players-heading" className="sr-only">
          Players
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
          {run.status === "running" ? "Calculating" : status}
        </p>
        {players.length < MAX_PLAYERS && (
          <button
            type="button"
            onClick={() => setPlayers([...players, { kind: "random" }])}
            className="mt-3 h-12 rounded-full border-2 border-chalk px-5 font-bold font-display text-chalk text-xl focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3"
          >
            Add player
          </button>
        )}
      </section>

      <section aria-labelledby="board-heading" className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="board-heading" className="m-0 font-bold font-display text-3xl leading-none">
            Board
          </h2>
          {board.length > 0 && (
            <button type="button" onClick={() => setBoard([])} className={`-mr-4 ${textButton}`}>
              Clear<span className="sr-only"> board</span>
            </button>
          )}
        </div>
        <CardRow cards={board} slots={5} label={board.length > 0 ? "Edit the board" : "Add board cards"} onEdit={() => setSheet({ kind: "board" })} />
      </section>

      <section aria-labelledby="dead-heading" className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="dead-heading" className="m-0 font-bold font-display text-3xl leading-none">
            Dead cards
          </h2>
          {dead.length > 0 && (
            <button type="button" onClick={() => setDead([])} className={`-mr-4 ${textButton}`}>
              Clear<span className="sr-only"> dead cards</span>
            </button>
          )}
        </div>
        {dead.length > 0 ? (
          <CardRow cards={dead} slots={0} label="Edit the dead cards" onEdit={() => setSheet({ kind: "dead" })} />
        ) : (
          <button type="button" onClick={() => setSheet({ kind: "dead" })} className={`-ml-4 ${textButton}`}>
            Add dead cards
          </button>
        )}
      </section>

      {sheet?.kind === "hand" && editing?.kind === "hand" && (
        <CardKeypadSheet
          title={`Player ${sheet.player + 1}'s hand`}
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
          title={`Player ${sheet.player + 1}'s range`}
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
          title="Board"
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
          title="Dead cards"
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
