import type { ActionColour } from "@/lib/charts/model";
import styles from "./verdict-card.module.css";

type Props = {
  /** The answer face up, or null to show the back with `prompt`. */
  verdict: { title: string; colour: ActionColour; detail?: string | null; aside?: string | null } | null;
  /** Shown on the back while there is no answer, e.g. what to enter next. */
  prompt: string;
  /** A new key flips the card again, so a changed answer is noticed. */
  flipKey: string;
  /** Accessible prefix, e.g. "Chart says" or "Heuristic". */
  label: string;
  className?: string;
};

/** Titles with a longer word ("coucher", "Iso-raise") use a smaller size, so they fit the card on a 360px screen. */
const LONG_WORD = 6;

/** The answer as a chalk card that flips face up when it arrives. The flip is the app's only automatic motion. */
export function VerdictCard({ verdict, prompt, flipKey, label, className = "" }: Props) {
  const long = verdict?.title.split(/\s+/).some((word) => word.length > LONG_WORD);
  return (
    <div role="status" className={`${styles.card} ${verdict ? "" : styles.faceDown} ${className}`}>
      <div key={verdict ? flipKey : "back"} className={styles.flipper}>
        <div className={styles.face} aria-hidden={!verdict}>
          {verdict && (
            <>
              <span aria-hidden="true" className={styles.band} style={{ background: `var(--color-${verdict.colour})` }} />
              <div className={styles.body}>
                <span className="sr-only">{`${label}: `}</span>
                <span className={`${styles.title} ${long ? styles.long : ""}`}>{verdict.title}</span>
                {verdict.detail && <span className={styles.detail}>{verdict.detail}</span>}
                {verdict.aside && <span className={styles.aside}>{verdict.aside}</span>}
              </div>
            </>
          )}
        </div>
        <div className={styles.back} aria-hidden={Boolean(verdict)}>
          <span className={styles.prompt}>{prompt}</span>
        </div>
      </div>
    </div>
  );
}
