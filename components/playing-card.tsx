import type { Card, Rank } from "@/lib/poker/card";
import styles from "./playing-card.module.css";
import { SUIT_COLOR, SUIT_NAMES, SuitIcon } from "./suit-icon";

const RANK_NAMES: Record<Rank, string> = {
  A: "Ace",
  K: "King",
  Q: "Queen",
  J: "Jack",
  T: "Ten",
  "9": "Nine",
  "8": "Eight",
  "7": "Seven",
  "6": "Six",
  "5": "Five",
  "4": "Four",
  "3": "Three",
  "2": "Two",
};

type Props = {
  /** `null` shows the back; switching to a card flips it face up. */
  card: Card | null;
  size?: "lg" | "md" | "sm";
  className?: string;
};

export function PlayingCard({ card, size = "lg", className = "" }: Props) {
  const label = card ? `${RANK_NAMES[card.rank]} of ${SUIT_NAMES[card.suit]}` : "Face-down card";
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
