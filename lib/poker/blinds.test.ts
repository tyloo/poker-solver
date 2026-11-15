import { describe, expect, it } from "vitest";
import { BLIND_STRUCTURE } from "@/content/blind-structure";
import { blindLevel, blindLevels, stackDepth, validateBlindStructure } from "./blinds";

describe("Blind structure file", () => {
  it("starts at 10,000 chips with the league levels", () => {
    expect(BLIND_STRUCTURE.startingStack).toBe(10_000);
    expect(blindLevels(BLIND_STRUCTURE, 9).map(({ sb, bb }) => `${sb}/${bb}`)).toEqual([
      "50/50",
      "50/100",
      "100/200",
      "150/300",
      "200/400",
      "300/600",
      "500/1000",
      "1000/2000",
      "2000/4000",
    ]);
  });

  it("is valid", () => {
    expect(validateBlindStructure(BLIND_STRUCTURE)).toEqual([]);
  });
});

describe("blindLevel", () => {
  const structure = {
    levels: [
      { bb: 50, sb: 50 },
      { bb: 100, sb: 50 },
      { bb: 4000, sb: 2000 },
    ],
    startingStack: 10_000,
  };

  it("numbers levels from 1", () => {
    expect(blindLevel(structure, 1)).toEqual({ bb: 50, sb: 50 });
    expect(blindLevel(structure, 3)).toEqual({ bb: 4000, sb: 2000 });
  });

  it("keeps doubling past the listed levels", () => {
    expect(blindLevel(structure, 4)).toEqual({ bb: 8000, sb: 4000 });
    expect(blindLevel(structure, 6)).toEqual({ bb: 32_000, sb: 16_000 });
  });

  it("rejects level numbers below 1", () => {
    expect(() => blindLevel(structure, 0)).toThrow();
  });
});

describe("validateBlindStructure", () => {
  it("rejects empty, shrinking or inverted levels", () => {
    expect(validateBlindStructure({ levels: [], startingStack: 10_000 })).toEqual(["At least one Blind level is needed"]);
    expect(
      validateBlindStructure({
        levels: [
          { bb: 200, sb: 100 },
          { bb: 100, sb: 50 },
        ],
        startingStack: 10_000,
      }),
    ).toEqual(["Level 2 (50/100) is lower than level 1"]);
    expect(validateBlindStructure({ levels: [{ bb: 100, sb: 200 }], startingStack: 10_000 })).toEqual(["Level 1 (200/100): the small blind is above the big blind"]);
    expect(validateBlindStructure({ levels: [{ bb: 100, sb: 50 }], startingStack: 0 })).toEqual(["The starting stack must be a positive number of chips"]);
  });
});

describe("stackDepth", () => {
  it("measures chips in big blinds", () => {
    expect(stackDepth(10_000, { bb: 100, sb: 50 })).toBe(100);
    expect(stackDepth(7_300, { bb: 400, sb: 200 })).toBe(18.25);
  });
});
