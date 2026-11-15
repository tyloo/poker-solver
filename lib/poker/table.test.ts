import { describe, expect, it } from "vitest";
import { OPEN_SIZE_BB, POSITIONS, stackTierFor, tablePositions } from "./table";

describe("tablePositions", () => {
  it("seats all eight Positions at a full table", () => {
    expect(tablePositions(8)).toEqual(POSITIONS);
  });

  it("drops the earliest Positions first when short-handed", () => {
    expect(tablePositions(6)).toEqual(["LJ", "HJ", "CO", "BTN", "SB", "BB"]);
    expect(tablePositions(3)).toEqual(["BTN", "SB", "BB"]);
    expect(tablePositions(2)).toEqual(["SB", "BB"]);
  });

  it("rejects impossible player counts", () => {
    expect(() => tablePositions(1)).toThrow();
    expect(() => tablePositions(9)).toThrow();
    expect(() => tablePositions(5.5)).toThrow();
  });
});

describe("stackTierFor", () => {
  it("follows the spec boundaries: ≥33 / 21–32 / 15–20 / below 15", () => {
    expect(stackTierFor(200)).toBe("40bb+");
    expect(stackTierFor(33)).toBe("40bb+");
    expect(stackTierFor(32)).toBe("25bb");
    expect(stackTierFor(21)).toBe("25bb");
    expect(stackTierFor(20)).toBe("15-20bb");
    expect(stackTierFor(15)).toBe("15-20bb");
    expect(stackTierFor(14.9)).toBe("push-fold");
    expect(stackTierFor(1)).toBe("push-fold");
  });

  it("puts fractional depths between tiers into the shallower tier", () => {
    expect(stackTierFor(32.9)).toBe("25bb");
    expect(stackTierFor(20.5)).toBe("15-20bb");
  });
});

describe("OPEN_SIZE_BB", () => {
  it("opens 2.5bb at 40bb+ and 2bb in the shallower tiers", () => {
    expect(OPEN_SIZE_BB).toEqual({ "15-20bb": 2, "25bb": 2, "40bb+": 2.5 });
  });
});
