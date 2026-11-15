import { describe, expect, it } from "vitest";
import { validateChart } from "./chart-validation";
import { parseCombo, parseHandClass } from "./combo";
import { handClassWeights } from "./range";

function errorsOf(actions: Record<string, string>): string[] {
  const result = validateChart(actions);
  if (result.ok) throw new Error("expected the Chart to be rejected");
  return result.errors;
}

describe("validateChart", () => {
  it("accepts mixed Action frequencies that sum to at most 1", () => {
    const result = validateChart({ call: "ATo:0.3, 99-77", raise: "TT+, AJo+, ATo:0.7, A5s:0.1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(handClassWeights(result.ranges.raise)[parseHandClass("ATo") ?? -1]).toBe(0.7);
    expect(handClassWeights(result.ranges.call)[parseHandClass("99") ?? -1]).toBe(1);
  });

  it("tolerates floating-point rounding at exactly 1", () => {
    expect(validateChart({ call: "KQo:0.2", limp: "KQo:0.1", raise: "KQo:0.7" }).ok).toBe(true);
  });

  it("names the action of an invalid range string", () => {
    expect(errorsOf({ call: "AKx", raise: "AA" })).toEqual([expect.stringMatching(/^call: .*"AKx"/)]);
  });

  it("rejects overlaps inside one action", () => {
    expect(errorsOf({ raise: "AKs, AQs+" })).toEqual([expect.stringMatching(/^raise: AKs appears twice/)]);
  });

  it("rejects Hand classes whose frequencies sum above 1, listing each action", () => {
    expect(errorsOf({ call: "AJo:0.5, KK", raise: "AJo:0.7, QQ+" })).toEqual(["KK: frequencies sum to 2 (call 1, raise 1)", "AJo: frequencies sum to 1.2 (call 0.5, raise 0.7)"]);
  });

  it("checks specific Combos against Hand classes", () => {
    expect(errorsOf({ call: "AKs:0.5", raise: "AsKs:0.75" })).toEqual(["AsKs: frequencies sum to 1.25 (call 0.5, raise 0.75)"]);
    expect(validateChart({ call: "AKs:0.25", raise: "AsKs:0.75" }).ok).toBe(true);
  });

  it("reports every problem at once", () => {
    expect(errorsOf({ call: "AKs, 1x", raise: "QQ-JJs" })).toHaveLength(2);
  });

  it("exposes parsed ranges per action", () => {
    const result = validateChart({ raise: "AsKd" });
    expect(result.ok && result.ranges.raise[parseCombo("AsKd") ?? -1]).toBe(1);
  });
});
