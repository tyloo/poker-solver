"use client";

import { useEffect, useState } from "react";
import { CardKeypadSheet } from "@/components/card-keypad-sheet";
import { PlayingCard } from "@/components/playing-card";
import { RangeGrid } from "@/components/range-grid";
import { CARD_COUNT, cardFromId } from "@/lib/poker/card";
import { HAND_CLASS_COUNT, HAND_CLASS_NAMES, type HandClassId, handClassCombos } from "@/lib/poker/combo";
import { actionColours, actionLabel, actionPhrase, actionShares, chanceLabel, formatBb } from "@/lib/solver/display";
import type { NodeView } from "@/lib/solver/solver";
import type { Player } from "@/lib/solver/spot";

type Step = { index: number; label: string };

const percent = (share: number) => (share > 0 && share < 0.0005 ? "<0.1%" : `${(share * 100).toFixed(share > 0 && share < 0.1 ? 1 : 0)}%`);
const combos = (count: number) => (Number.isInteger(count) ? String(count) : count.toFixed(1));
const textButton = "h-11 rounded-full px-3 font-bold text-dust underline decoration-2 underline-offset-4 hover:text-chalk focus-visible:outline-3 focus-visible:outline-chalk";

function nodeHeading(node: NodeView, players: readonly [string, string]): string {
  const pot = formatBb(node.pot);
  if (node.kind === "action" && node.player !== null) return `${players[node.player]} to act. Pot ${pot}, ${formatBb(node.stacks[node.player])} behind.`;
  if (node.kind === "chance") return `Pot ${pot}. The ${node.board.length === 3 ? "turn" : "river"} comes next.`;
  if (node.kind === "fold" && node.folder !== null) return `${players[node.folder]} folds. ${players[node.folder === 0 ? 1 : 0]} wins the ${pot} pot.`;
  return `Showdown for a ${pot} pot.`;
}

type Props = {
  query: (path: readonly number[]) => Promise<NodeView>;
  /** [OOP, IP] names. */
  players: readonly [string, string];
  /** Changes when the solve has new results, so the shown node is read again. */
  version: string;
  /** Hand class to open on, e.g. the hero's hand. */
  initialClass: HandClassId | null;
};

/** Browses the solved game tree: the strategy grid of the current decision, its actions, chance cards and per-Hand-class numbers. */
export function Strategy({ query, players, version, initialClass }: Props) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [view, setView] = useState<{ key: string; node: NodeView } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Player | null>(null);
  const [selected, setSelected] = useState<HandClassId | null>(initialClass);
  const [picking, setPicking] = useState(false);

  const path = steps.map((step) => step.index);
  const pathKey = path.join(".");

  useEffect(() => {
    let live = true;
    setError(null);
    query(path).then(
      (node) => {
        if (live) setView({ key: pathKey, node });
      },
      (reason: unknown) => {
        if (live) setError(reason instanceof Error ? reason.message : String(reason));
      },
    );
    return () => {
      live = false;
    };
  }, [pathKey, version]);

  const go = (next: Step[]) => {
    setSteps(next);
    setViewer(null);
  };

  const node = view?.node ?? null;
  const loading = view?.key !== pathKey;
  const shown: Player = viewer ?? node?.player ?? 0;
  const range = node?.ranges[shown];
  const acting = node !== null && node.kind === "action" && node.player === shown;
  const colours = node ? actionColours(node.actions) : [];
  const shares = node ? actionShares(node) : [];
  const classes = range?.handClasses;
  const strategyAt = (a: number, cls: HandClassId) => classes?.strategy?.[a * HAND_CLASS_COUNT + cls] ?? Number.NaN;
  const inRange = (cls: HandClassId) => (classes?.combos[cls] ?? 0) > 1e-9;

  const segments = (cls: HandClassId) => {
    if (!node || !classes || !inRange(cls)) return [];
    if (acting) return node.actions.flatMap((action, a) => (action.kind === "fold" ? [] : [{ color: colours[a], share: strategyAt(a, cls) }]));
    return [{ color: "var(--color-chalk)", share: Math.min(1, classes.combos[cls] / handClassCombos(cls).length) }];
  };

  const classStrategy = (cls: HandClassId) =>
    node
      ? node.actions
          .map((action, a) => ({ label: actionLabel(action), share: strategyAt(a, cls) }))
          .filter((entry) => entry.share >= 0.005)
          .sort((a, b) => b.share - a.share)
          .map((entry) => `${entry.label} ${percent(entry.share)}`)
          .join(", ")
      : "";

  const describe = (cls: HandClassId) => {
    const name = HAND_CLASS_NAMES[cls];
    if (!inRange(cls)) return `${name}, not in range`;
    return acting ? `${name}: ${classStrategy(cls)}` : `${name}, ${combos(classes?.combos[cls] ?? 0)} combos`;
  };

  const status = error ?? (loading ? "Reading the tree…" : "");

  return (
    <section aria-labelledby="strategy-heading" className="mt-8">
      <h2 id="strategy-heading" className="m-0 mb-3 font-bold font-display text-3xl leading-none">
        Strategy
      </h2>

      <nav aria-label="Path through the tree">
        <ol className="m-0 mb-3 flex list-none flex-wrap items-center gap-x-1 gap-y-0 p-0">
          {[{ index: -1, label: "Start" }, ...steps].map((step, i) => {
            const last = i === steps.length;
            return (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <span aria-hidden="true" className="text-dust">
                    ›
                  </span>
                )}
                {last ? (
                  <span aria-current="location" className="px-1 py-2.5 font-bold">
                    {step.label}
                  </span>
                ) : (
                  <button type="button" onClick={() => go(steps.slice(0, i))} className={textButton}>
                    {step.label}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <p role="status" className={`m-0 min-h-[1.5em] ${error ? "text-raise" : "text-dust"}`}>
        {status}
      </p>

      {node && (
        <div className={`flex flex-col gap-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <ul aria-label="Board" className="m-0 flex list-none gap-2 p-0">
            {node.board.map((card) => (
              <li key={card}>
                <PlayingCard card={cardFromId(card)} size="sm" />
              </li>
            ))}
          </ul>
          <p className="m-0 font-bold text-xl">{nodeHeading(node, players)}</p>

          {node.kind === "action" && node.player !== null && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label={`${players[node.player]}'s actions`}>
              {node.actions.map((action, a) => (
                <li key={a}>
                  <button
                    type="button"
                    onClick={() => go([...steps, { index: a, label: actionPhrase(players[node.player as Player], action) }])}
                    className="flex h-12 w-full items-center justify-between rounded-xl bg-booth px-4 text-left font-bold focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2"
                  >
                    <span className="flex items-center gap-3">
                      <span aria-hidden="true" className="size-3.5 rounded-[3px] border border-dust/40" style={{ background: colours[a] }} />
                      {actionLabel(action)}
                    </span>
                    <span className="font-normal text-dust">{shares[a] === undefined ? "" : percent(shares[a])}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {node.kind === "chance" && (
            <div>
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="h-12 rounded-full bg-chalk px-6 font-bold font-display text-night text-xl focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3"
              >
                {`Pick the ${node.board.length === 3 ? "turn" : "river"} card`}
              </button>
            </div>
          )}

          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-1.5 p-0 text-dust">Range shown</legend>
            <div className="flex gap-1">
              {([0, 1] as const).map((player) => (
                <button
                  key={player}
                  type="button"
                  aria-pressed={shown === player}
                  onClick={() => setViewer(player)}
                  className="h-11 flex-1 rounded-xl bg-booth font-bold font-display text-lg leading-none focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2 aria-pressed:bg-chalk aria-pressed:text-night"
                >
                  {`${players[player]} (${player === 0 ? "OOP" : "IP"})`}
                </button>
              ))}
            </div>
          </fieldset>

          <RangeGrid
            label={acting ? `${players[shown]}'s strategy` : `${players[shown]}'s range here`}
            segments={segments}
            describe={describe}
            content={(cls) => <span className={inRange(cls) ? "" : "opacity-35"}>{HAND_CLASS_NAMES[cls]}</span>}
            selected={selected}
            onSelect={(cls) => setSelected(cls === selected ? null : cls)}
          />

          {range && (
            <p className="m-0 text-dust">
              {`${players[shown]}'s range: ${combos(range.total.combos)} combos, EV ${Number.isNaN(range.total.ev) ? "–" : formatBb(range.total.ev)}, equity ${
                Number.isNaN(range.total.equity) ? "–" : percent(range.total.equity)
              }.`}
            </p>
          )}

          <div aria-live="polite" className="min-h-[4.5em] rounded-2xl bg-booth p-4">
            {selected === null || !classes ? (
              <p className="m-0 text-dust">Tap a hand for its combos, EV and equity.</p>
            ) : (
              <>
                <p className="m-0 font-bold font-display text-2xl leading-none">{HAND_CLASS_NAMES[selected]}</p>
                {inRange(selected) ? (
                  <>
                    <dl className="m-0 mt-2 grid grid-cols-3 gap-2">
                      {[
                        { label: "Combos", value: combos(classes.combos[selected]) },
                        { label: "EV", value: Number.isNaN(classes.ev[selected]) ? "–" : formatBb(classes.ev[selected]) },
                        { label: "Equity", value: Number.isNaN(classes.equity[selected]) ? "–" : percent(classes.equity[selected]) },
                      ].map((item) => (
                        <div key={item.label}>
                          <dt className="text-dust text-sm">{item.label}</dt>
                          <dd className="m-0 font-bold text-xl">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                    {acting && <p className="mt-2 mb-0">{classStrategy(selected)}</p>}
                  </>
                ) : (
                  <p className="mt-2 mb-0 text-dust">{`Not in ${players[shown]}'s range here.`}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {picking && node?.kind === "chance" && (
        <CardKeypadSheet
          title={node.board.length === 3 ? "Turn card" : "River card"}
          value={[]}
          max={1}
          unavailable={Array.from({ length: CARD_COUNT }, (_, card) => card).filter((card) => !node.cards.includes(card))}
          onDone={([card]) => {
            setPicking(false);
            const index = card === undefined ? -1 : node.cards.indexOf(card);
            if (index >= 0) go([...steps, { index, label: chanceLabel(card, node.board.length) }]);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  );
}
