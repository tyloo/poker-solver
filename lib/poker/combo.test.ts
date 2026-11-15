import { describe, expect, it } from "vitest";
import { cardId } from "./card";
import {
  COMBO_COUNT,
  comboCards,
  comboId,
  formatCombo,
  HAND_CLASS_COUNT,
  HAND_CLASS_NAMES,
  handClassCombos,
  handClassKind,
  handClassOfCombo,
  parseCombo,
  parseHandClass,
} from "./combo";

const id = (text: string) => cardId({ rank: text[0] as "A", suit: text[1] as "s" });

describe("combos", () => {
  it("index all 1326 two-card combos uniquely, in either card order", () => {
    expect(COMBO_COUNT).toBe(1326);
    const seen = new Set<number>();
    for (let a = 0; a < 52; a++) {
      for (let b = 0; b < a; b++) {
        const combo = comboId(a, b);
        expect(comboId(b, a)).toBe(combo);
        expect(combo).toBeGreaterThanOrEqual(0);
        expect(combo).toBeLessThan(COMBO_COUNT);
        const [hi, lo] = comboCards(combo);
        expect([hi, lo]).toEqual([a, b]);
        seen.add(combo);
      }
    }
    expect(seen.size).toBe(COMBO_COUNT);
  });

  it("format the higher rank first, pairs in s-h-d-c suit order", () => {
    expect(formatCombo(comboId(id("Kd"), id("As")))).toBe("AsKd");
    expect(formatCombo(comboId(id("Ac"), id("As")))).toBe("AsAc");
    expect(formatCombo(comboId(id("2h"), id("2d")))).toBe("2h2d");
  });

  it("parse compact notation in any order", () => {
    expect(parseCombo("AsKd")).toBe(comboId(id("As"), id("Kd")));
    expect(parseCombo("kdas")).toBe(comboId(id("As"), id("Kd")));
    expect(parseCombo("AsAs")).toBeNull();
    expect(parseCombo("AsK")).toBeNull();
    expect(parseCombo("AxKd")).toBeNull();
  });
});

describe("hand classes", () => {
  it("list the 169 classes in 13×13 grid order: pairs on the diagonal, suited above, offsuit below", () => {
    expect(HAND_CLASS_COUNT).toBe(169);
    expect(HAND_CLASS_NAMES.slice(0, 13)).toEqual(["AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s"]);
    expect(HAND_CLASS_NAMES[13]).toBe("AKo");
    expect(HAND_CLASS_NAMES[14]).toBe("KK");
    expect(HAND_CLASS_NAMES[168]).toBe("22");
    expect(HAND_CLASS_NAMES[12 * 13]).toBe("A2o");
    expect(new Set(HAND_CLASS_NAMES).size).toBe(169);
  });

  it("parse names, with or without a canonical rank order", () => {
    expect(parseHandClass("AKs")).toBe(1);
    expect(parseHandClass("KAs")).toBe(1);
    expect(parseHandClass("akO")).toBe(13);
    expect(parseHandClass("22")).toBe(168);
    expect(parseHandClass("AAs")).toBeNull();
    expect(parseHandClass("AK")).toBeNull();
    expect(parseHandClass("AX")).toBeNull();
  });

  it("know their kind", () => {
    expect(handClassKind(0)).toBe("pair");
    expect(handClassKind(1)).toBe("suited");
    expect(handClassKind(13)).toBe("offsuit");
  });

  it("partition the 1326 combos as 6 per pair, 4 per suited and 12 per offsuit class", () => {
    let total = 0;
    for (let cls = 0; cls < HAND_CLASS_COUNT; cls++) {
      const combos = handClassCombos(cls);
      const expected = { pair: 6, suited: 4, offsuit: 12 }[handClassKind(cls)];
      expect(combos.length).toBe(expected);
      for (const combo of combos) expect(handClassOfCombo(combo)).toBe(cls);
      total += combos.length;
    }
    expect(total).toBe(COMBO_COUNT);
  });

  it("map specific combos to their class", () => {
    expect(HAND_CLASS_NAMES[handClassOfCombo(parseCombo("AsKs") ?? -1)]).toBe("AKs");
    expect(HAND_CLASS_NAMES[handClassOfCombo(parseCombo("Td9c") ?? -1)]).toBe("T9o");
    expect(HAND_CLASS_NAMES[handClassOfCombo(parseCombo("7h7c") ?? -1)]).toBe("77");
  });
});
