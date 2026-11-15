import { HAND_CLASS_COUNT, type HandClassId } from "@/lib/poker/combo";
import { createRange, formatRange, handClassWeights, parseRange, setHandClassWeight } from "@/lib/poker/range";
import type { ActionId } from "./model";

/** Scratchpad edits: one frequency per Hand class for each written action, in Chart order. Fold (or check) is the remainder. */
export type Draft = Partial<Record<ActionId, Float64Array>>;

const entries = (draft: Draft) => Object.entries(draft) as [ActionId, Float64Array][];

export function draftFromStrings(actions: readonly ActionId[], strings: Readonly<Partial<Record<ActionId, string>>>): Record<ActionId, Float64Array> {
  const draft = {} as Record<ActionId, Float64Array>;
  for (const id of actions) {
    const parsed = parseRange(strings[id] ?? "");
    draft[id] = parsed.ok ? handClassWeights(parsed.range) : new Float64Array(HAND_CLASS_COUNT);
  }
  return draft;
}

const floorCents = (value: number) => Math.floor(value * 100 + 1e-9) / 100;

/**
 * Paints `action` at `frequency` on one Hand class. The other actions shrink in proportion so the
 * total stays at most 1; painting the remainder action shrinks every written action. Returns a new Draft.
 */
export function paintDraft<D extends Draft>(draft: D, cls: HandClassId, action: ActionId, frequency: number): D {
  const next = Object.fromEntries(entries(draft).map(([id, weights]) => [id, Float64Array.from(weights)])) as D;
  const written = next[action];
  if (written) written[cls] = frequency;
  const others = entries(next).filter(([id]) => id !== action);
  const room = 1 - frequency;
  const used = others.reduce((sum, [, weights]) => sum + weights[cls], 0);
  if (used > room + 1e-9) for (const [, weights] of others) weights[cls] = floorCents((weights[cls] * room) / used);
  return next;
}

export function draftStrings(draft: Draft): Partial<Record<ActionId, string>> {
  return Object.fromEntries(
    entries(draft).map(([id, weights]) => {
      const range = createRange();
      for (let cls = 0; cls < HAND_CLASS_COUNT; cls++) setHandClassWeight(range, cls, weights[cls]);
      return [id, formatRange(range)];
    }),
  );
}

/** The Draft as a Chart entry such as `{ raise: "22+", limp: "A2s+" }`, ready to paste into a Chart file. */
export function draftSnippet(draft: Draft): string {
  return `{ ${Object.entries(draftStrings(draft))
    .map(([id, text]) => `${id}: ${JSON.stringify(text)}`)
    .join(", ")} }`;
}
