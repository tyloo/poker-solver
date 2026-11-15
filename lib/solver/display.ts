import { type CardId, cardFromId, formatCards } from "@/lib/poker/card";
import type { NodeView } from "./solver";
import { CHIPS_PER_BB } from "./spot-setup";
import type { SolverAction } from "./tree";

export const formatBb = (chips: number) => `${Number((chips / CHIPS_PER_BB).toFixed(2))}bb`;

export function actionLabel(action: SolverAction): string {
  switch (action.kind) {
    case "check":
      return "Check";
    case "fold":
      return "Fold";
    case "call":
      return `Call ${formatBb(action.amount)}`;
    case "bet":
      return `Bet ${formatBb(action.to)}`;
    case "raise":
      return `Raise to ${formatBb(action.to)}`;
    case "allin":
      return `All-in ${formatBb(action.to)}`;
  }
}

/** "BTN bets 1.82bb". */
export function actionPhrase(player: string, action: SolverAction): string {
  switch (action.kind) {
    case "check":
      return `${player} checks`;
    case "fold":
      return `${player} folds`;
    case "call":
      return `${player} calls ${formatBb(action.amount)}`;
    case "bet":
      return `${player} bets ${formatBb(action.to)}`;
    case "raise":
      return `${player} raises to ${formatBb(action.to)}`;
    case "allin":
      return `${player} goes all-in ${formatBb(action.to)}`;
  }
}

/** "Turn 7c": the card a chance node deals after a board of `boardCards`. */
export function chanceLabel(card: CardId, boardCards: number): string {
  return `${boardCards === 3 ? "Turn" : "River"} ${formatCards([cardFromId(card)])}`;
}

/** Grid colours per action: passive Call, all-in Push, fold Fold; bets and raises in Raise shades, the smallest lightest. */
export function actionColours(actions: readonly SolverAction[]): string[] {
  const sized = actions.filter((action) => action.kind === "bet" || action.kind === "raise");
  return actions.map((action) => {
    if (action.kind === "fold") return "var(--color-fold)";
    if (action.kind === "check" || action.kind === "call") return "var(--color-call)";
    if (action.kind === "allin") return "var(--color-push)";
    const index = sized.indexOf(action);
    if (index === sized.length - 1) return "var(--color-raise)";
    const strength = Math.round(40 + (60 * index) / (sized.length - 1 || 1));
    return `color-mix(in oklab, var(--color-raise) ${strength}%, var(--color-chalk))`;
  });
}

/** How often the player to act takes each action, over their whole Range at the node. */
export function actionShares(view: NodeView): number[] {
  if (view.player === null || view.actions.length === 0) return [];
  const { reach, strategy } = view.ranges[view.player];
  if (!strategy) return [];
  const n = reach.length;
  const total = reach.reduce((sum, weight) => sum + weight, 0);
  return view.actions.map((_, a) => {
    let sum = 0;
    for (let h = 0; h < n; h++) if (reach[h] > 0) sum += reach[h] * strategy[a * n + h];
    return total > 0 ? sum / total : 0;
  });
}
