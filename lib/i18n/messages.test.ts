import { describe, expect, it } from "vitest";
import { en, type Messages } from "./en";
import { fr } from "./fr";

type Entry = { path: string; value: unknown };

function entries(node: unknown, path = ""): Entry[] {
  if (node === null || typeof node !== "object") return [{ path, value: node }];
  return Object.entries(node).flatMap(([key, value]) => entries(value, path ? `${path}.${key}` : key));
}

const shape = ({ path, value }: Entry) => `${path}: ${typeof value === "function" ? `function/${value.length}` : typeof value}`;

describe("French dictionary", () => {
  const english = entries(en);
  const french = entries(fr);

  it("has every English key, with the same kind of value", () => {
    expect(french.map(shape).sort()).toEqual(english.map(shape).sort());
  });

  it("has no empty string", () => {
    const empty = french.filter(({ value }) => typeof value === "string" && value.trim() === "").map(({ path }) => path);
    expect(empty).toEqual([]);
  });

  it("is actually French", () => {
    const strings = (list: Entry[]) => new Map(list.filter(({ value }) => typeof value === "string").map(({ path, value }) => [path, value]));
    const englishStrings = strings(english);
    const same = [...strings(french)].filter(([path, value]) => englishStrings.get(path) === value).map(([path]) => path);
    // Poker anglicisms and abbreviations read the same in French; most strings must not.
    expect(same.length).toBeLessThan(englishStrings.size / 4);
  });
});

describe("numbers in the text", () => {
  // A count big enough to need a thousands separator: "12,500" in English, "12 500" in French.
  const big = 12_500;
  const grouped = { en: "12,500", fr: "12\u202f500" } as const;
  const texts: [string, (t: Messages) => string][] = [
    ["common.combos", (t) => t.common.combos(big)],
    ["grid.classSummary", (t) => t.grid.classSummary("AKs", big, "")],
    ["pushFold.summary", (t) => t.pushFold.summary("AKs", big, "", "")],
    ["table.handed", (t) => t.table.handed(big)],
    ["equity.player", (t) => t.equity.player(big - 1)],
    ["equity.tooMany", (t) => t.equity.tooMany(big)],
    ["solver.estimate decisions", (t) => t.solver.estimate(big, 2 ** 20, 1, 1)],
    ["solver.estimate OOP combos", (t) => t.solver.estimate(1, 2 ** 20, big, 1)],
    ["solver.estimate IP combos", (t) => t.solver.estimate(1, 2 ** 20, 1, big)],
    ["solver.measuring", (t) => t.solver.measuring(big)],
    ["solver.running", (t) => t.solver.running(big, 0.01, 1000)],
    ["solver.converged", (t) => t.solver.converged(0.01, big, 1000)],
    ["solver.stopped", (t) => t.solver.stopped(0.01, big, 1000)],
    ["solver.maxIterations", (t) => t.solver.maxIterations(big, 0.01)],
    ["glossary.count", (t) => t.glossary.count(big)],
  ];

  for (const [name, text] of texts) {
    it(`formats every number of ${name} for the language`, () => {
      expect(text(en)).toContain(grouped.en);
      expect(text(fr)).toContain(grouped.fr);
    });
  }

  it("writes bet sizes as percentages for the language", () => {
    expect(en.solver.betSize(33)).toBe("33%");
    expect(fr.solver.betSize(33)).toBe("33\u00a0%");
  });
});
