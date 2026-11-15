import { CARD_COUNT, type CardId } from "@/lib/poker/card";
import { COMBO_COUNT, COMBO_HI, COMBO_LO } from "@/lib/poker/combo";
import type { Range } from "@/lib/poker/range";

/** 0 is out of position (acts first on every street), 1 is in position. */
export type Player = 0 | 1;

export const PLAYER_NAMES = ["OOP", "IP"] as const;

/**
 * A heads-up postflop Spot. Chips are any unit (the pot and stack just have to agree).
 * All-in is always offered on top of the listed sizes.
 */
export type Spot = {
  /** 3 (flop), 4 (turn) or 5 (river) cards. */
  board: readonly CardId[];
  /** [OOP, IP]. */
  ranges: readonly [Range, Range];
  pot: number;
  /** Chips behind for each player at the start of the Spot. */
  effectiveStack: number;
  /** Bets as fractions of the pot, e.g. 0.33. */
  betSizes: readonly number[];
  /** Raises as multiples of the bet faced ("raise to 3×"). */
  raiseSizes: readonly number[];
  /** Raises allowed per street after the first bet. Defaults to DEFAULT_MAX_RAISES. */
  maxRaises?: number;
};

export const DEFAULT_BET_SIZES: readonly number[] = [0.33, 0.75];
export const DEFAULT_RAISE_SIZES: readonly number[] = [3];
export const DEFAULT_MAX_RAISES = 3;

/** Combos of the Range that do not touch the board, with their weights. */
export function liveCombos(range: Range, board: readonly CardId[]): { combos: Uint16Array; weights: Float64Array } {
  const dead = new Uint8Array(CARD_COUNT);
  for (const card of board) dead[card] = 1;
  const combos: number[] = [];
  for (let combo = 0; combo < COMBO_COUNT; combo++) {
    if (!(range[combo] > 0) || dead[COMBO_HI[combo]] || dead[COMBO_LO[combo]]) continue;
    combos.push(combo);
  }
  return { combos: Uint16Array.from(combos), weights: Float64Array.from(combos, (combo) => Math.min(range[combo], 1)) };
}

/** A reason the Spot cannot be solved, or null. */
export function validateSpot(spot: Spot): string | null {
  const { board } = spot;
  if (board.length < 3 || board.length > 5) return "The board needs 3, 4 or 5 cards";
  if (board.some((card) => !Number.isInteger(card) || card < 0 || card >= CARD_COUNT) || new Set(board).size !== board.length) {
    return "The board has an invalid or repeated card";
  }
  if (!(spot.pot > 0) || !Number.isFinite(spot.pot)) return "The pot must be positive";
  if (!(spot.effectiveStack >= 0) || !Number.isFinite(spot.effectiveStack)) return "The effective stack cannot be negative";
  if (spot.betSizes.some((size) => !(size > 0) || !Number.isFinite(size))) return "Bet sizes must be positive fractions of the pot";
  if (spot.raiseSizes.some((size) => !(size > 1) || !Number.isFinite(size))) return "Raise sizes must be multiples above 1× the bet";
  if (spot.maxRaises !== undefined && !(Number.isInteger(spot.maxRaises) && spot.maxRaises >= 0)) return "The raise cap must be a whole number";
  if (board.length === 3 && spot.betSizes.length > 1) return "Flop Spots allow one bet size plus all-in";
  for (const player of [0, 1] as const) {
    if (liveCombos(spot.ranges[player], board).combos.length === 0) return `The ${PLAYER_NAMES[player]} Range is empty on this board`;
  }
  return null;
}
