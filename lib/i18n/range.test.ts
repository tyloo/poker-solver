import { describe, expect, it } from "vitest";
import { parseRange } from "@/lib/poker/range";
import { rangeErrorText } from "./range";

function textOf(range: string, locale: "en" | "fr"): string {
  const result = parseRange(range);
  if (result.ok) throw new Error(`expected "${range}" to be rejected`);
  return rangeErrorText(result.error, locale);
}

describe("rangeErrorText", () => {
  it("explains the problem in English, naming the entry", () => {
    expect(textOf("AKx", "en")).toBe('Invalid entry "AKx"');
    expect(textOf("AAs", "en")).toBe('Pairs cannot be suited or offsuit: "AAs"');
    expect(textOf("AsAs", "en")).toBe('"AsAs" repeats a card');
    expect(textOf("AKs:1.5", "en")).toBe('Invalid frequency in "AKs:1.5": use a number above 0 and at most 1');
    expect(textOf("KTs-Q8s", "en")).toBe('"KTs-Q8s": both ends must share the first rank');
    expect(textOf("KTs-K8o", "en")).toBe('"KTs-K8o": both ends must be suited, both offsuit, or both unmarked');
    expect(textOf("QQ-AKs", "en")).toBe('"QQ-AKs": both ends must be pairs, or neither');
    expect(textOf("AKs, AQs+", "en")).toBe('AKs appears twice: "AQs+" overlaps an earlier entry');
  });

  it("explains the problem in French", () => {
    expect(textOf("AKx", "fr")).toBe("Entrée invalide\u00a0: «\u00a0AKx\u00a0»");
    expect(textOf("AA, AA", "fr")).toBe("AA apparaît deux fois\u00a0: «\u00a0AA\u00a0» recoupe une entrée précédente");
  });
});
