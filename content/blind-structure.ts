import type { BlindStructure } from "@/lib/poker/blinds";

/** RedCactus league structure. No antes. Past the last listed level both blinds keep doubling. */
export const BLIND_STRUCTURE: BlindStructure = {
  levels: [
    { bb: 50, sb: 50 },
    { bb: 100, sb: 50 },
    { bb: 200, sb: 100 },
    { bb: 300, sb: 150 },
    { bb: 400, sb: 200 },
    { bb: 600, sb: 300 },
    { bb: 1000, sb: 500 },
    { bb: 2000, sb: 1000 },
    { bb: 4000, sb: 2000 },
  ],
  startingStack: 10_000,
};
