"use client";

import { useEffect, useState } from "react";
import { primaryButton, textButton } from "@/components/buttons";
import { CardKeypadSheet } from "@/components/card-keypad-sheet";
import { useI18n } from "@/components/i18n-provider";
import { PlayingCard } from "@/components/playing-card";
import { RangeGrid } from "@/components/range-grid";
import type { Locale } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";
import { actionLabel, solverErrorText, stepLabel } from "@/lib/i18n/solver";
import { CARD_COUNT, cardFromId } from "@/lib/poker/card";
import { HAND_CLASS_COUNT, HAND_CLASS_NAMES, type HandClassId, handClassCombos } from "@/lib/poker/combo";
import { actionColours, actionShares, formatChips, type StepSource } from "@/lib/solver/display";
import { solverErrorOf } from "@/lib/solver/errors";
import type { NodeView } from "@/lib/solver/solver";
import type { Player } from "@/lib/solver/spot";
import { TREE_PATH_PARAM, treePathCodec } from "@/lib/solver/spot-url";
import { codecs, HAND_CLASS_PARAM, setUrlParams, useUrlState } from "@/lib/url-state";

function nodeHeading(node: NodeView, players: readonly [string, string], locale: Locale): string {
  const t = messages(locale).strategy;
  const pot = formatChips(node.pot, locale);
  if (node.kind === "action" && node.player !== null) return t.toAct(players[node.player], pot, formatChips(node.stacks[node.player], locale));
  if (node.kind === "chance") return t.chance(pot, node.board.length === 3);
  if (node.kind === "fold" && node.folder !== null) return t.folds(players[node.folder], players[node.folder === 0 ? 1 : 0], pot);
  return t.showdown(pot);
}

type Props = {
  query: (path: readonly number[]) => Promise<NodeView>;
  /** [OOP, IP] names. */
  players: readonly [string, string];
  /** Changes when the solve has new results, so the shown node is read again. */
  version: string;
  /** Hand class selected when the URL names none, e.g. the hero's. */
  heroClass: HandClassId | null;
};

const slim = ({ kind, player, actions, cards, board }: NodeView): StepSource => ({ actions, board, cards, kind, player });

/**
 * Browses the solved game tree: the strategy grid of the current decision, its actions, chance cards and per-Hand-class numbers.
 * The path and the selected Hand class live in the URL; a path the tree does not have falls back to the root.
 */
export function Strategy({ query, players, version, heroClass }: Props) {
  const { locale, t } = useI18n();
  const text = t.strategy;
  const percent = text.share;
  const combos = text.combosValue;
  const [path, setPath] = useUrlState(TREE_PATH_PARAM, treePathCodec, "push");
  const [selected, setSelected] = useUrlState(HAND_CLASS_PARAM, codecs.handClass(heroClass));
  const [view, setView] = useState<{ key: string; node: NodeView } | null>(null);
  /** Nodes already read, by path, to name the steps of the breadcrumb. */
  const [sources, setSources] = useState<Record<string, StepSource>>({});
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ key: string; player: Player } | null>(null);
  const [picking, setPicking] = useState(false);

  const pathKey = path.join(".");

  useEffect(() => {
    let live = true;
    setError(null);
    const unnamed = path.map((_, i) => path.slice(0, i)).filter((prefix) => !(prefix.join(".") in sources));
    Promise.all([query(path), ...unnamed.map(query)]).then(
      ([node, ...parents]) => {
        if (!live) return;
        setSources((known) => Object.fromEntries([...Object.entries(known), ...[node, ...parents].map((read) => [read.path.join("."), slim(read)])]));
        setView({ key: pathKey, node });
      },
      (reason: unknown) => {
        if (!live) return;
        if (path.length > 0) setUrlParams({ [TREE_PATH_PARAM]: null });
        else setError(solverErrorText(solverErrorOf(reason), players, locale));
      },
    );
    return () => {
      live = false;
    };
  }, [pathKey, version]);

  const steps = path.map((index, i) => {
    const source = sources[path.slice(0, i).join(".")];
    return { index, label: (source && stepLabel(source, index, players, locale)) ?? "…" };
  });

  const node = view?.node ?? null;
  const loading = view?.key !== pathKey;
  const shown: Player = viewer?.key === pathKey ? viewer.player : (node?.player ?? 0);
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
          .map((action, a) => ({ label: actionLabel(action, locale), share: strategyAt(a, cls) }))
          .filter((entry) => entry.share >= 0.005)
          .sort((a, b) => b.share - a.share)
          .map((entry) => `${entry.label} ${percent(entry.share)}`)
          .join(", ")
      : "";

  const describe = (cls: HandClassId) => {
    const name = HAND_CLASS_NAMES[cls];
    if (!inRange(cls)) return text.notInRange(name);
    return acting ? `${name}: ${classStrategy(cls)}` : text.classCombos(name, classes?.combos[cls] ?? 0);
  };

  const status = error ?? (loading ? text.reading : "");

  return (
    <section aria-labelledby="strategy-heading" className="mt-8">
      <h2 id="strategy-heading" className="m-0 mb-3 font-bold font-display text-3xl leading-none">
        {text.heading}
      </h2>

      <nav aria-label={text.path}>
        <ol className="m-0 mb-3 flex list-none flex-wrap items-center gap-x-1 gap-y-0 p-0">
          {[{ index: -1, label: text.start }, ...steps].map((step, i) => {
            const last = i === steps.length;
            return (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <span aria-hidden="true" className="text-dust">
                    ›
                  </span>
                )}
                {last ? (
                  <span aria-current="location" className="px-1 py-3 font-bold">
                    {step.label}
                  </span>
                ) : (
                  <button type="button" onClick={() => setPath(path.slice(0, i))} className={textButton}>
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
        <div className={`flex flex-col gap-4 ${loading ? "opacity-60" : ""}`}>
          <ul aria-label={t.common.board} className="m-0 flex list-none gap-2 p-0">
            {node.board.map((card) => (
              <li key={card}>
                <PlayingCard card={cardFromId(card)} size="sm" />
              </li>
            ))}
          </ul>
          <p className="m-0 font-bold text-xl">{nodeHeading(node, players, locale)}</p>

          {node.kind === "action" && node.player !== null && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label={text.actionsOf(players[node.player])}>
              {node.actions.map((action, a) => (
                <li key={a}>
                  <button
                    type="button"
                    onClick={() => setPath([...path, a])}
                    className="flex h-12 w-full items-center justify-between rounded-xl bg-booth px-4 text-left font-bold focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2"
                  >
                    <span className="flex items-center gap-3">
                      <span aria-hidden="true" className="size-3.5 rounded-[3px] border border-dust/40" style={{ background: colours[a] }} />
                      {actionLabel(action, locale)}
                    </span>
                    <span className="font-normal text-dust">{shares[a] === undefined ? "" : percent(shares[a])}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {node.kind === "chance" && (
            <div>
              <button type="button" onClick={() => setPicking(true)} className={primaryButton}>
                {text.pickCard(node.board.length === 3)}
              </button>
            </div>
          )}

          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-1.5 p-0 text-dust">{text.rangeShown}</legend>
            <div className="flex gap-1">
              {([0, 1] as const).map((player) => (
                <button
                  key={player}
                  type="button"
                  aria-pressed={shown === player}
                  onClick={() => setViewer({ key: pathKey, player })}
                  className="h-11 flex-1 rounded-xl bg-booth font-bold font-display text-lg leading-none focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2 aria-pressed:bg-chalk aria-pressed:text-night"
                >
                  {t.solver.side(players[player], player)}
                </button>
              ))}
            </div>
          </fieldset>

          <RangeGrid
            label={acting ? text.strategyOf(players[shown]) : text.rangeHere(players[shown])}
            segments={segments}
            describe={describe}
            content={(cls) => <span className={inRange(cls) ? "" : "opacity-35"}>{HAND_CLASS_NAMES[cls]}</span>}
            selected={selected}
            onSelect={(cls) => setSelected(cls === selected ? null : cls)}
          />

          {range && (
            <p className="m-0 text-dust">
              {text.totals(
                players[shown],
                range.total.combos,
                Number.isNaN(range.total.ev) ? "–" : formatChips(range.total.ev, locale),
                Number.isNaN(range.total.equity) ? "–" : percent(range.total.equity),
              )}
            </p>
          )}

          <div aria-live="polite" className="min-h-[4.5em] rounded-2xl bg-booth p-4">
            {selected === null || !classes ? (
              <p className="m-0 text-dust">{text.tapHand}</p>
            ) : (
              <>
                <p className="m-0 font-bold font-display text-2xl leading-none">{HAND_CLASS_NAMES[selected]}</p>
                {inRange(selected) ? (
                  <>
                    <dl className="m-0 mt-2 grid grid-cols-3 gap-2">
                      {[
                        { label: text.combos, value: combos(classes.combos[selected]) },
                        { label: text.ev, value: Number.isNaN(classes.ev[selected]) ? "–" : formatChips(classes.ev[selected], locale) },
                        { label: text.equity, value: Number.isNaN(classes.equity[selected]) ? "–" : percent(classes.equity[selected]) },
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
                  <p className="mt-2 mb-0 text-dust">{text.notInRangeHere(players[shown])}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {picking && node?.kind === "chance" && (
        <CardKeypadSheet
          title={node.board.length === 3 ? text.turnCard : text.riverCard}
          value={[]}
          max={1}
          unavailable={Array.from({ length: CARD_COUNT }, (_, card) => card).filter((card) => !node.cards.includes(card))}
          onDone={([card]) => {
            setPicking(false);
            const index = card === undefined ? -1 : node.cards.indexOf(card);
            if (index >= 0) setPath([...path, index]);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  );
}
