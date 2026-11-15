"use client";

import { PlayingCard } from "@/components/playing-card";
import { type Card, formatCards, parseCards, RANKS, SUITS } from "@/lib/poker/card";
import { codecs, useUrlState } from "@/lib/url-state";

function dealTwo(): Card[] {
  const deck = RANKS.flatMap((rank) => SUITS.map((suit) => ({ rank, suit })));
  const first = deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
  const second = deck[Math.floor(Math.random() * deck.length)];
  return [first, second];
}

// Placeholder until the Advisor inputs land: deals a hand into the URL.
export function SampleHand() {
  const [hand, setHand] = useUrlState("hand", codecs.string(""), "push");
  const cards = parseCards(hand);
  const [first, second] = cards?.length === 2 ? cards : [null, null];

  return (
    <section aria-label="Your hand" className="flex flex-col items-start gap-8">
      <div className="flex gap-4 pl-1">
        <PlayingCard card={first} className="-rotate-3" />
        <PlayingCard card={second} className="mt-2 rotate-2" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setHand(formatCards(dealTwo()))}
          className="h-12 rounded-full bg-chalk px-6 font-bold font-display text-night text-xl focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3"
        >
          Deal a sample hand
        </button>
        {first && (
          <button
            type="button"
            onClick={() => setHand("")}
            className="h-12 rounded-full px-4 font-bold text-dust underline decoration-2 underline-offset-4 hover:text-chalk focus-visible:outline-3 focus-visible:outline-chalk"
          >
            Clear
          </button>
        )}
      </div>
    </section>
  );
}
