import { formatRange, parseRange, type Range } from "@/lib/poker/range";
import { linePlayers, lineSpot } from "./preflop-line";
import { PLAYER_NAMES, type Spot, validateSpot } from "./spot";
import type { SpotSetup } from "./spot-url";

/** The Solver works in chips: 1bb = 100, so bets round to 0.01bb. */
export const CHIPS_PER_BB = 100;

/** Bet sizes offered in the setup, in % of the pot. */
export const BET_SIZE_OPTIONS = [25, 33, 50, 75, 100, 150] as const;
export const DEFAULT_BETS = [33, 75];
/** Flop Spots allow one bet size plus all-in. */
export const DEFAULT_FLOP_BET = 75;

export type Street = "flop" | "turn" | "river";

const STREETS: Record<number, Street> = { 3: "flop", 4: "turn", 5: "river" };

/** The bet sizes (in % of the pot) a Spot with this many board cards uses. */
export function betSizesFor(bets: readonly number[] | null, boardCards: number): number[] {
  if (boardCards === 3) return [bets && bets.length > 0 ? Math.max(...bets) : DEFAULT_FLOP_BET];
  return bets && bets.length > 0 ? [...bets] : DEFAULT_BETS;
}

export type ResolvedSetup = {
  /** [OOP, IP] names: Positions from the Preflop line, else "OOP" and "IP". */
  players: [string, string];
  street: Street | null;
  /** In bb; NaN when neither the URL nor the line gives one. */
  pot: number;
  stack: number;
  /** [OOP, IP] range strings in effect ("" when missing). */
  rangeTexts: [string, string];
  /** Bet sizes in % of the pot, and raise multiples (none on the flop, where raises are all-in only). */
  bets: number[];
  raises: number[];
  spot: Spot | null;
  /** Why there is no Spot yet, in a sentence. */
  reason: string | null;
  /** Identifies the Spot: equal keys mean the same solve. */
  key: string;
};

/** Turns the URL setup into a Spot, filling what the URL leaves out from the Preflop line. */
export function resolveSetup(setup: SpotSetup): ResolvedSetup {
  const line = setup.line ? lineSpot(setup.line, setup.depth) : null;
  const fromLine = line?.ok ? line : null;
  const players: [string, string] = setup.line ? linePlayers(setup.line) : [PLAYER_NAMES[0], PLAYER_NAMES[1]];
  const street = STREETS[setup.board.length] ?? null;
  const pot = setup.pot ?? fromLine?.pot ?? Number.NaN;
  const stack = setup.stack ?? fromLine?.stack ?? Number.NaN;
  const rangeTexts = [0, 1].map((player) => setup.ranges[player] ?? (fromLine ? formatRange(fromLine.ranges[player]) : "")) as [string, string];
  const bets = betSizesFor(setup.bets, setup.board.length);
  const raises = street === "flop" ? [] : [setup.raise];
  const key = JSON.stringify([setup.board, pot, stack, rangeTexts, bets, raises]);

  const result = (spot: Spot | null, reason: string | null): ResolvedSetup => ({ bets, key, players, pot, rangeTexts, raises, reason, spot, stack, street });

  const lineNeeded = setup.pot === null || setup.stack === null || setup.ranges.some((text) => text === null);
  if (line && !line.ok && lineNeeded) return result(null, `${line.error}.`);
  if (!street) return result(null, "Pick 3, 4 or 5 board cards.");
  if (Number.isNaN(pot) || Number.isNaN(stack)) return result(null, "Set the pot and the effective stack.");

  const ranges: Range[] = [];
  for (const player of [0, 1] as const) {
    const fromChart = setup.ranges[player] === null && fromLine;
    if (fromChart) {
      ranges.push(fromLine.ranges[player]);
      continue;
    }
    const parsed = parseRange(rangeTexts[player]);
    if (!parsed.ok) return result(null, `${players[player]}'s range: ${parsed.error}`);
    if (!parsed.range.some((weight) => weight > 0)) return result(null, `Paint a range for ${players[player]}.`);
    ranges.push(parsed.range);
  }

  const spot: Spot = {
    betSizes: bets.map((size) => size / 100),
    board: setup.board,
    effectiveStack: Math.round(stack * CHIPS_PER_BB),
    pot: Math.round(pot * CHIPS_PER_BB),
    raiseSizes: raises,
    ranges: [ranges[0], ranges[1]],
  };
  const error = validateSpot(spot);
  if (error) return result(null, `${error.replace(/The (OOP|IP) Range/, (_, name: string) => `${players[name === "OOP" ? 0 : 1]}'s range`)}.`);
  return result(spot, null);
}
