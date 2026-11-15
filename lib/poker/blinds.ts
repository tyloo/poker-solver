export type BlindLevel = { sb: number; bb: number };

export type BlindStructure = { startingStack: number; levels: readonly BlindLevel[] };

/** Blind level `n`, counted from 1. Past the listed levels both blinds keep doubling. */
export function blindLevel(structure: BlindStructure, n: number): BlindLevel {
  if (!Number.isInteger(n) || n < 1) throw new Error(`Blind levels count from 1, not ${n}`);
  const { levels } = structure;
  if (n <= levels.length) return levels[n - 1];
  const last = levels[levels.length - 1];
  const factor = 2 ** (n - levels.length);
  return { bb: last.bb * factor, sb: last.sb * factor };
}

/** The first `count` Blind levels. */
export function blindLevels(structure: BlindStructure, count: number): BlindLevel[] {
  return Array.from({ length: count }, (_, index) => blindLevel(structure, index + 1));
}

export const stackDepth = (chips: number, level: BlindLevel): number => chips / level.bb;

const show = ({ sb, bb }: BlindLevel) => `${sb}/${bb}`;

export function validateBlindStructure({ startingStack, levels }: BlindStructure): string[] {
  const errors: string[] = [];
  if (!(startingStack > 0) || !Number.isInteger(startingStack)) errors.push("The starting stack must be a positive number of chips");
  if (levels.length === 0) errors.push("At least one Blind level is needed");
  levels.forEach((level, index) => {
    const name = `Level ${index + 1} (${show(level)})`;
    if (!(level.sb > 0 && level.bb > 0) || !Number.isInteger(level.sb) || !Number.isInteger(level.bb)) errors.push(`${name}: blinds must be positive whole chips`);
    else if (level.sb > level.bb) errors.push(`${name}: the small blind is above the big blind`);
    const previous = levels[index - 1];
    if (previous && (level.bb < previous.bb || level.sb < previous.sb)) errors.push(`${name} is lower than level ${index}`);
  });
  return errors;
}
