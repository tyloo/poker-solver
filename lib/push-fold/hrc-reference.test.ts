import { describe, expect, it } from "vitest";
import { HAND_CLASS_COUNT, parseHandClass } from "@/lib/poker/combo";
import { headsUpMismatches } from "./hrc-reference";

const everything = () => new Float64Array(HAND_CLASS_COUNT).fill(1);

describe("headsUpMismatches", () => {
  it("accepts frequencies that agree", () => {
    expect(headsUpMismatches("SB push", [everything()], [100], { "72o": 1.6, AA: Infinity })).toEqual([]);
  });

  it("reports shares and Hand classes that disagree", () => {
    const folds72o = everything();
    folds72o[parseHandClass("72o") ?? -1] = 0;
    expect(headsUpMismatches("SB push", [everything(), folds72o], [100, 90], { "72o": 1.6, K2o: 11.65 })).toEqual(["SB push at 2bb: 99.10% of hands, reference 90%"]);
    expect(headsUpMismatches("SB push", [everything(), everything()], [100, 100], { "72o": 1.6 })).toEqual(["SB push at 2bb: 72o played, reference plays it up to 1.6bb"]);
    expect(headsUpMismatches("BB call", [folds72o], [99.1], { "72o": 2.65 })).toEqual(["BB call at 1bb: 72o folded, reference plays it up to 2.65bb"]);
  });

  it("skips stacks right at a threshold", () => {
    expect(
      headsUpMismatches("SB push", [everything(), everything(), everything(), everything(), everything(), everything(), everything()], [100, 100, 100, 100, 100, 100, 100], {
        "86o": 7.0,
      }),
    ).toEqual([]);
  });
});
