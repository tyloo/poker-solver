"use client";

import type { Card } from "@/lib/poker/card";
import { useI18n } from "./i18n-provider";
import styles from "./playing-card.module.css";
import { SUIT_COLOR, SuitIcon } from "./suit-icon";

type Props = {
  /** `null` shows the back; switching to a card flips it face up. */
  card: Card | null;
  size?: "lg" | "md" | "sm";
  className?: string;
};

export function PlayingCard({ card, size = "lg", className = "" }: Props) {
  const { cards } = useI18n().t;
  const label = card ? cards.name(cards.ranks[card.rank], cards.suits[card.suit]) : cards.faceDown;
  const sizeClass = size === "lg" ? "" : styles[size];

  return (
    <div role="img" aria-label={label} className={`${styles.card} ${sizeClass} ${card ? "" : styles.faceDown} ${className}`}>
      <div className={styles.flipper}>
        <div className={`${styles.face} ${card ? SUIT_COLOR[card.suit] : ""}`}>
          {card && (
            <>
              <span className={styles.corner}>
                <span className={styles.rank}>{card.rank === "T" ? "10" : card.rank}</span>
                <SuitIcon suit={card.suit} className={styles.cornerSuit} />
              </span>
              <SuitIcon suit={card.suit} className={styles.bigSuit} />
            </>
          )}
        </div>
        <div className={styles.back} />
      </div>
    </div>
  );
}
