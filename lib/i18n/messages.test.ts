import { describe, expect, it } from "vitest";
import { en } from "./en";
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
