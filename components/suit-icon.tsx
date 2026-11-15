import type { Suit } from "@/lib/poker/card";

const PATHS: Record<Suit, string> = {
  s: "M12 2C9 6 4 9 4 13.5 4 16 6 18 8.5 18c1.3 0 2.4-.5 3-1.3-.3 2-1 3.6-2.5 5.3h6c-1.5-1.7-2.2-3.3-2.5-5.3.6.8 1.7 1.3 3 1.3 2.5 0 4.5-2 4.5-4.5C20 9 15 6 12 2z",
  h: "M12 21C7 16.5 2.5 12.8 2.5 8.2 2.5 5.3 4.8 3 7.6 3c1.8 0 3.4.9 4.4 2.4C13 3.9 14.6 3 16.4 3c2.8 0 5.1 2.3 5.1 5.2 0 4.6-4.5 8.3-9.5 12.8z",
  d: "M12 2l7.5 10L12 22 4.5 12z",
  c: "M12 2.5a4.3 4.3 0 0 0-3.9 6.1A4.3 4.3 0 1 0 10 16.4c.4-.2.8-.5 1.1-.8-.3 2.4-1 4.4-2.6 6.4h7c-1.6-2-2.3-4-2.6-6.4.3.3.7.6 1.1.8a4.3 4.3 0 1 0 1.9-7.8A4.3 4.3 0 0 0 12 2.5z",
};

export const SUIT_NAMES: Record<Suit, string> = { s: "spades", h: "hearts", d: "diamonds", c: "clubs" };

export const SUIT_COLOR: Record<Suit, string> = {
  s: "text-spade",
  h: "text-heart",
  d: "text-diamond",
  c: "text-club",
};

export function SuitIcon({ suit, className }: { suit: Suit; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d={PATHS[suit]} />
    </svg>
  );
}
