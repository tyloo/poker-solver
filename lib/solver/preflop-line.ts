import { getChart } from "@/lib/charts/charts";
import { type ActionId, type ChartKey, heroPositions, openerGroupOf } from "@/lib/charts/model";
import type { BlindLevel } from "@/lib/poker/blinds";
import type { Range } from "@/lib/poker/range";
import { OPEN_SIZE_BB, POSITIONS, type Position, postflopOrder, preflopOrder, type StackTier, stackTierFor } from "@/lib/poker/table";

export type OpenerPosition = Exclude<Position, "BB">;

export const OPENER_POSITIONS = POSITIONS.filter((position): position is OpenerPosition => position !== "BB");

/** A heads-up Preflop line: one player opens and one calls, or the SB limps and the BB checks. */
export type PreflopLine = { kind: "open"; opener: OpenerPosition; caller: Position } | { kind: "limp" };

export const DEFAULT_LINE: PreflopLine = { caller: "BB", kind: "open", opener: "BTN" };
/** Starting Stack depth (bb) of a Preflop line. */
export const DEFAULT_DEPTH = 40;
/** Below this the Push/fold charts apply, so there is no raised pot to take postflop. */
export const MIN_DEPTH = 15;

/** Blinds where the SB is half the BB, as at every level but level 1. */
const HALF_SB: BlindLevel = { bb: 2, sb: 1 };

/** Where a Preflop line leads, in bb. Players and Ranges are [OOP, IP]. */
export type LineSpot = { ok: true; tier: StackTier; pot: number; stack: number; players: [Position, Position]; ranges: [Range, Range] } | { ok: false; error: string };

/** Positions that can call an open from `opener` (they act after it and have a Vs open Chart). */
export function callerPositions(opener: OpenerPosition): Position[] {
  const group = openerGroupOf(opener);
  if (!group) return [];
  return heroPositions("vs-open", group).filter((position) => preflopOrder(position) > preflopOrder(opener));
}

export function isValidLine(line: PreflopLine): boolean {
  return line.kind === "limp" || callerPositions(line.opener).includes(line.caller);
}

/** [OOP, IP] Positions of a line. */
export function linePlayers(line: PreflopLine): [Position, Position] {
  if (line.kind === "limp") return ["SB", "BB"];
  const { opener, caller } = line;
  return postflopOrder(opener) < postflopOrder(caller) ? [opener, caller] : [caller, opener];
}

function chartRange(key: ChartKey, action: ActionId): Range {
  const range = getChart(key).actions.find((entry) => entry.id === action)?.range;
  if (!range) throw new Error(`The ${key.position} Chart has no ${action} action`);
  return range.slice();
}

/** Fills both Ranges from the Charts and works out the pot and effective stack after the line, with the real blinds of `level`. */
export function lineSpot(line: PreflopLine, depth: number, level: BlindLevel = HALF_SB): LineSpot {
  const tier = stackTierFor(depth);
  if (tier === "push-fold") return { error: `Below ${MIN_DEPTH}bb the Push/fold charts apply: pick a deeper stack`, ok: false };
  if (!isValidLine(line)) return { error: "The caller must act after the opener", ok: false };
  const players = linePlayers(line);

  if (line.kind === "limp") {
    const sb = chartRange({ position: "SB", situation: "open", tier }, "limp");
    const bb = chartRange({ limpers: "1", position: "BB", situation: "vs-limpers", tier }, "check");
    return { ok: true, players, pot: 2, ranges: [sb, bb], stack: depth - 1, tier };
  }

  const { opener, caller } = line;
  const size = OPEN_SIZE_BB[tier];
  const group = openerGroupOf(opener);
  if (!group) return { error: "The opener must be a Position before the BB", ok: false };
  const openRange = chartRange({ position: opener, situation: "open", tier }, "raise");
  const callRange = chartRange({ opener: group, position: caller, situation: "vs-open", tier }, "call");
  const dead = (opener === "SB" || caller === "SB" ? 0 : level.sb / level.bb) + (caller === "BB" ? 0 : 1);
  const ranges: [Range, Range] = players[0] === opener ? [openRange, callRange] : [callRange, openRange];
  return { ok: true, players, pot: 2 * size + dead, ranges, stack: depth - size, tier };
}

/** "CO opens 2.5bb, BB calls, 40bb". */
export function describeLine(line: PreflopLine, depth: number): string {
  if (line.kind === "limp") return `SB limps, BB checks, ${depth}bb`;
  const tier = stackTierFor(depth);
  const size = tier === "push-fold" ? "" : ` ${OPEN_SIZE_BB[tier]}bb`;
  return `${line.opener} opens${size}, ${line.caller} calls, ${depth}bb`;
}
