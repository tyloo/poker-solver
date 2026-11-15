import { RANKS } from "./card";
import { COMBO_COUNT, COMBO_HAND_CLASS, type ComboId, formatCombo, HAND_CLASS_COUNT, HAND_CLASS_NAMES, type HandClassId, handClassCombos, parseCombo } from "./combo";

/** A Range as one weight in [0, 1] per Combo, indexed by ComboId. */
export type Range = Float64Array;

export type RangeParseResult = { ok: true; range: Range } | { ok: false; error: string };

export const createRange = (): Range => new Float64Array(COMBO_COUNT);

const isUniform = (range: Range, combos: readonly ComboId[]) => combos.every((combo) => range[combo] === range[combos[0]]);

/** Mean Combo weight of each Hand class, indexed by HandClassId (exact when its Combos share one weight). */
export function handClassWeights(range: Range): Float64Array {
  const weights = new Float64Array(HAND_CLASS_COUNT);
  for (let cls = 0; cls < HAND_CLASS_COUNT; cls++) {
    const combos = handClassCombos(cls);
    if (isUniform(range, combos)) {
      weights[cls] = range[combos[0]];
      continue;
    }
    let sum = 0;
    for (const combo of combos) sum += range[combo];
    weights[cls] = sum / combos.length;
  }
  return weights;
}

export function setHandClassWeight(range: Range, cls: HandClassId, weight: number): void {
  for (const combo of handClassCombos(cls)) range[combo] = weight;
}

// Ranks in this module are grid indexes: 0 = A … 12 = 2.
type Suffix = "" | "s" | "o";
type ClassToken = { high: number; low: number; suffix: Suffix };

const RANK_PATTERN = "[2-9TJQKA]";
const CLASS_PATTERN = `(${RANK_PATTERN})(${RANK_PATTERN})([SO]?)`;
const COMBO_RE = /^[2-9TJQKA][SHDC][2-9TJQKA][SHDC]$/;
const SINGLE_RE = new RegExp(`^${CLASS_PATTERN}$`);
const PLUS_RE = new RegExp(`^${CLASS_PATTERN}\\+$`);
const SPAN_RE = new RegExp(`^${CLASS_PATTERN}-${CLASS_PATTERN}$`);
const WEIGHT_RE = /^(\d+(\.\d*)?|\.\d+)$/;

const rankIndex = (rank: string) => RANKS.indexOf(rank as (typeof RANKS)[number]);

function classToken(a: string, b: string, suffix: string): ClassToken {
  const [high, low] = [rankIndex(a), rankIndex(b)].sort((x, y) => x - y);
  return { high, low, suffix: suffix.toLowerCase() as Suffix };
}

function classIds({ high, low, suffix }: ClassToken): HandClassId[] {
  if (high === low) return [high * 13 + high];
  const suited = high * 13 + low;
  const offsuit = low * 13 + high;
  return suffix === "s" ? [suited] : suffix === "o" ? [offsuit] : [suited, offsuit];
}

/** Hand classes named by an entry without its frequency, or an error message. */
function expandEntry(entry: string): HandClassId[] | ComboId | string {
  const text = entry.toUpperCase();
  if (COMBO_RE.test(text)) return parseCombo(entry) ?? `"${entry}" repeats a card`;

  const single = SINGLE_RE.exec(text);
  const plus = PLUS_RE.exec(text);
  const span = SPAN_RE.exec(text);
  const tokens = single
    ? [classToken(single[1], single[2], single[3])]
    : plus
      ? [classToken(plus[1], plus[2], plus[3])]
      : span
        ? [classToken(span[1], span[2], span[3]), classToken(span[4], span[5], span[6])]
        : null;
  if (!tokens) return `Invalid entry "${entry}"`;
  if (tokens.some((token) => token.high === token.low && token.suffix !== "")) return `Pairs cannot be suited or offsuit: "${entry}"`;
  if (single) return classIds(tokens[0]);

  const classes: HandClassId[] = [];
  if (plus) {
    const { high, low, suffix } = tokens[0];
    // Pairs climb to AA; other classes climb the kicker up to just below the first rank.
    if (high === low) for (let pair = low; pair >= 0; pair--) classes.push(...classIds({ high: pair, low: pair, suffix }));
    else for (let kicker = low; kicker > high; kicker--) classes.push(...classIds({ high, low: kicker, suffix }));
    return classes;
  }

  const [from, to] = tokens;
  const fromPair = from.high === from.low;
  if (fromPair !== (to.high === to.low)) return `"${entry}": both ends must be pairs, or neither`;
  if (fromPair) {
    for (let pair = Math.max(from.high, to.high); pair >= Math.min(from.high, to.high); pair--) classes.push(pair * 14);
    return classes;
  }
  if (from.high !== to.high) return `"${entry}": both ends must share the first rank`;
  if (from.suffix !== to.suffix) return `"${entry}": both ends must be suited, both offsuit, or both unmarked`;
  for (let kicker = Math.max(from.low, to.low); kicker >= Math.min(from.low, to.low); kicker--) classes.push(...classIds({ high: from.high, low: kicker, suffix: from.suffix }));
  return classes;
}

/**
 * Parses a range string such as "22+, A2s+, KTs-K8s, AKo, AsKd, ATo:0.5".
 * Entries are comma-separated; each Combo may be named only once.
 */
export function parseRange(text: string): RangeParseResult {
  const range = createRange();
  const assigned = new Uint8Array(COMBO_COUNT);
  for (const rawEntry of text.split(",")) {
    const entry = rawEntry.trim();
    if (entry === "") continue;
    const colon = entry.indexOf(":");
    const body = colon < 0 ? entry : entry.slice(0, colon).trim();
    let weight = 1;
    if (colon >= 0) {
      const weightText = entry.slice(colon + 1).trim();
      weight = Number(weightText);
      if (!WEIGHT_RE.test(weightText) || !(weight > 0 && weight <= 1)) return { error: `Invalid frequency in "${entry}": use a number above 0 and at most 1`, ok: false };
    }

    const expanded = expandEntry(body);
    if (typeof expanded === "string") return { error: expanded, ok: false };
    const combos = typeof expanded === "number" ? [expanded] : expanded.flatMap((cls) => handClassCombos(cls));
    const overlapping = combos.filter((combo) => assigned[combo]);
    if (overlapping.length > 0) {
      const cls = COMBO_HAND_CLASS[overlapping[0]];
      const wholeClass = handClassCombos(cls).every((combo) => assigned[combo] && combos.includes(combo));
      const name = wholeClass ? HAND_CLASS_NAMES[cls] : formatCombo(overlapping[0]);
      return { error: `${name} appears twice: "${entry}" overlaps an earlier entry`, ok: false };
    }
    for (const combo of combos) {
      assigned[combo] = 1;
      range[combo] = weight;
    }
  }
  return { ok: true, range };
}

const pairName = (rank: number) => RANKS[rank] + RANKS[rank];

/** Entries for a run of consecutive pairs, given as grid ranks `top <= bottom`. */
function pairRunEntry(top: number, bottom: number): string {
  if (top === bottom) return pairName(top);
  return top === 0 ? `${pairName(bottom)}+` : `${pairName(top)}-${pairName(bottom)}`;
}

/** Entry for kickers `top <= bottom` (grid ranks) under the first rank `high`. */
function kickerRunEntry(high: number, top: number, bottom: number, suffix: Suffix): string {
  const name = (kicker: number) => RANKS[high] + RANKS[kicker] + suffix;
  if (top === bottom) return name(top);
  return top === high + 1 ? `${name(bottom)}+` : `${name(top)}-${name(bottom)}`;
}

/** Maximal runs `[top, bottom]` of consecutive grid ranks in `from..to` that pass `included`. */
function runs(from: number, to: number, included: (rank: number) => boolean): [number, number][] {
  const result: [number, number][] = [];
  for (let rank = from; rank <= to; rank++) {
    if (!included(rank)) continue;
    const last = result.at(-1);
    if (last && last[1] === rank - 1) last[1] = rank;
    else result.push([rank, rank]);
  }
  return result;
}

/** Shortest entries for the Hand classes in `classes`, all sharing one frequency. */
function classEntries(classes: ReadonlySet<HandClassId>): string[] {
  const pairs = runs(0, 12, (rank) => classes.has(rank * 14)).map(([top, bottom]) => pairRunEntry(top, bottom));
  const suited: string[] = [];
  const offsuit: string[] = [];
  for (let high = 0; high < 12; high++) {
    for (const [top, bottom] of runs(high + 1, 12, (low) => classes.has(high * 13 + low))) suited.push(kickerRunEntry(high, top, bottom, "s"));
    for (const [top, bottom] of runs(high + 1, 12, (low) => classes.has(low * 13 + high))) offsuit.push(kickerRunEntry(high, top, bottom, "o"));
  }
  return [...pairs, ...suited, ...offsuit];
}

/**
 * Formats a Range as the shortest range string, in a stable order: full weight first, then
 * lower frequencies; within each, pairs, suited, offsuit, then Combos. Suited and offsuit are
 * always written apart (`AKs, AKo`, never `AK`).
 * Hand classes whose Combos carry different weights are written as Combos.
 */
export function formatRange(range: Range): string {
  const classesByWeight = new Map<number, Set<HandClassId>>();
  const combosByWeight = new Map<number, ComboId[]>();
  for (let cls = 0; cls < HAND_CLASS_COUNT; cls++) {
    const combos = handClassCombos(cls);
    const weight = range[combos[0]];
    if (isUniform(range, combos)) {
      if (weight > 0) classesByWeight.set(weight, (classesByWeight.get(weight) ?? new Set()).add(cls));
      continue;
    }
    for (const combo of combos) {
      if (range[combo] > 0) combosByWeight.set(range[combo], [...(combosByWeight.get(range[combo]) ?? []), combo]);
    }
  }

  const weights = [...new Set([...classesByWeight.keys(), ...combosByWeight.keys()])].sort((a, b) => b - a);
  return weights
    .flatMap((weight) => {
      const suffix = weight === 1 ? "" : `:${weight}`;
      const entries = [...classEntries(classesByWeight.get(weight) ?? new Set()), ...(combosByWeight.get(weight) ?? []).map(formatCombo)];
      return entries.map((entry) => entry + suffix);
    })
    .join(", ");
}
