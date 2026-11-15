"use client";

import { useState } from "react";
import { type CardId, cardFromId, cardId, RANKS, type Rank, SUITS } from "@/lib/poker/card";
import { PlayingCard } from "./playing-card";
import { Sheet } from "./sheet";
import { SUIT_COLOR, SUIT_NAMES, SuitIcon } from "./suit-icon";

type Props = {
  title: string;
  value: readonly CardId[];
  /** Cards to pick at most; reaching it finishes the sheet (2 for a hand, 5 for a board). */
  max: number;
  /** Cards held elsewhere, e.g. other hands, the board or dead cards. */
  unavailable: readonly CardId[];
  onDone: (cards: CardId[]) => void;
  onClose: () => void;
};

const rankLabel = (rank: Rank) => (rank === "T" ? "10" : rank);
const KEY_RANKS: Record<string, Rank> = { "0": "T", "1": "T" };

const primaryButton =
  "h-12 rounded-full bg-chalk px-6 font-bold font-display text-night text-xl focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3";
const textButton = "h-12 rounded-full px-4 font-bold text-dust underline decoration-2 underline-offset-4 hover:text-chalk focus-visible:outline-3 focus-visible:outline-chalk";

/** Rank-then-suit keypad in a bottom sheet. Tap a picked card to take it back. */
export function CardKeypadSheet({ title, value, max, unavailable, onDone, onClose }: Props) {
  const [picked, setPicked] = useState<CardId[]>(() => value.slice(0, max));
  const [rank, setRank] = useState<Rank | null>(null);

  const taken = new Set([...unavailable, ...picked]);
  const full = picked.length >= max;
  const free = (r: Rank, suit: (typeof SUITS)[number]) => !taken.has(cardId({ rank: r, suit }));
  const slots = Math.min(max, 5);
  const placeholders = picked.length < slots ? slots - picked.length : full ? 0 : 1;

  const pickSuit = (suit: (typeof SUITS)[number]) => {
    if (!rank || full || !free(rank, suit)) return;
    const next = [...picked, cardId({ rank, suit })];
    setRank(null);
    if (next.length === max) onDone(next);
    else setPicked(next);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toUpperCase();
    const typedRank = KEY_RANKS[key] ?? RANKS.find((r) => r === key);
    const typedSuit = SUITS.find((suit) => suit === event.key.toLowerCase());
    if (typedRank && !full && SUITS.some((suit) => free(typedRank, suit))) setRank(typedRank);
    else if (typedSuit) pickSuit(typedSuit);
    else if (event.key === "Backspace") setPicked(picked.slice(0, -1));
    else return;
    event.preventDefault();
  };

  return (
    <Sheet
      title={title}
      onClose={onClose}
      actions={
        <>
          {picked.length > 0 && (
            <button type="button" onClick={() => setPicked([])} className={textButton}>
              Clear
            </button>
          )}
          <button type="button" onClick={() => onDone(picked)} className={primaryButton}>
            Done
          </button>
        </>
      }
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: typing ranks and suits is a shortcut for the buttons below. */}
      <div onKeyDown={onKeyDown}>
        <ul aria-label="Picked cards" className="m-0 mb-5 flex min-h-[3.75rem] list-none flex-wrap gap-2 p-0">
          {picked.map((card) => (
            <li key={card}>
              <button
                type="button"
                onClick={() => setPicked(picked.filter((other) => other !== card))}
                className="rounded-md focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3"
              >
                <span className="sr-only">Remove </span>
                <PlayingCard card={cardFromId(card)} size="sm" />
              </button>
            </li>
          ))}
          {Array.from({ length: placeholders }, (_, i) => (
            <li key={`empty-${i}`} aria-hidden="true" className="h-[3.5rem] w-[2.5rem] rounded-md border-2 border-chalk/25 border-dashed" />
          ))}
        </ul>

        <fieldset className="m-0 mb-3 border-0 p-0">
          <legend className="mb-2 text-dust">{rank ? `${rankLabel(rank)}: now pick a suit` : "Pick a rank, then a suit"}</legend>
          <div className="grid grid-cols-7 gap-1.5">
            {RANKS.map((r) => {
              const available = !full && SUITS.some((suit) => free(r, suit));
              return (
                <button
                  key={r}
                  type="button"
                  disabled={!available}
                  aria-pressed={rank === r}
                  onClick={() => setRank(rank === r ? null : r)}
                  className={`h-12 rounded-xl font-bold font-display text-2xl focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2 disabled:opacity-35 ${
                    rank === r ? "bg-chalk text-night" : "bg-night text-chalk"
                  }`}
                >
                  {rankLabel(r)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-4 gap-1.5">
          {SUITS.map((suit) => {
            const available = rank !== null && !full && free(rank, suit);
            return (
              <button
                key={suit}
                type="button"
                disabled={!available}
                onClick={() => pickSuit(suit)}
                className={`flex h-14 items-center justify-center rounded-xl bg-chalk focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2 disabled:opacity-35 ${SUIT_COLOR[suit]}`}
              >
                <SuitIcon suit={suit} className="h-7 w-7" />
                <span className="sr-only">{rank ? `${rankLabel(rank)} of ${SUIT_NAMES[suit]}` : SUIT_NAMES[suit]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
