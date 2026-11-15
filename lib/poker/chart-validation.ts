import { formatCombo, HAND_CLASS_COUNT, HAND_CLASS_NAMES, handClassCombos } from "./combo";
import { parseRange, type Range } from "./range";

export type ChartValidation<Action extends string> = { ok: true; ranges: Record<Action, Range> } | { ok: false; errors: string[] };

const TOLERANCE = 1e-9;
const show = (value: number) => String(Math.round(value * 1e6) / 1e6);

/**
 * Validates a Chart given as one range string per action (fold is the implicit remainder):
 * every string parses without overlaps, and the Action frequencies of each Combo sum to at most 1.
 */
export function validateChart<Action extends string>(actions: Readonly<Record<Action, string>>): ChartValidation<Action> {
  const names = Object.keys(actions) as Action[];
  const errors: string[] = [];
  const ranges = {} as Record<Action, Range>;
  for (const name of names) {
    const result = parseRange(actions[name]);
    if (result.ok) ranges[name] = result.range;
    else errors.push(`${name}: ${result.error}`);
  }
  if (errors.length > 0) return { errors, ok: false };

  const describe = (label: string, combo: number) => {
    const total = names.reduce((sum, name) => sum + ranges[name][combo], 0);
    const parts = names.filter((name) => ranges[name][combo] > 0).map((name) => `${name} ${show(ranges[name][combo])}`);
    return `${label}: frequencies sum to ${show(total)} (${parts.join(", ")})`;
  };
  for (let cls = 0; cls < HAND_CLASS_COUNT; cls++) {
    const combos = handClassCombos(cls);
    const over = combos.filter((combo) => names.reduce((sum, name) => sum + ranges[name][combo], 0) > 1 + TOLERANCE);
    if (over.length === 0) continue;
    const uniform = names.every((name) => combos.every((combo) => ranges[name][combo] === ranges[name][combos[0]]));
    if (uniform) errors.push(describe(HAND_CLASS_NAMES[cls], combos[0]));
    else for (const combo of over) errors.push(describe(formatCombo(combo), combo));
  }
  return errors.length > 0 ? { errors, ok: false } : { ok: true, ranges };
}
