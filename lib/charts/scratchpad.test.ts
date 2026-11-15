import { describe, expect, it } from "vitest";
import { parseHandClass } from "@/lib/poker/combo";
import { draftFromStrings, draftSnippet, draftStrings, paintDraft } from "./scratchpad";

const cls = (name: string) => parseHandClass(name) ?? -1;

describe("draftFromStrings", () => {
  it("reads one frequency per Hand class and action", () => {
    const draft = draftFromStrings(["raise", "call"], { call: "AJo:0.25", raise: "QQ+, AJo:0.75" });
    expect(draft.raise[cls("KK")]).toBe(1);
    expect([draft.raise[cls("AJo")], draft.call[cls("AJo")]]).toEqual([0.75, 0.25]);
  });

  it("treats a missing or invalid string as empty", () => {
    const draft = draftFromStrings(["raise", "limp"], { raise: "AKx" });
    expect(draft.raise.every((weight) => weight === 0)).toBe(true);
    expect(draft.limp.every((weight) => weight === 0)).toBe(true);
  });
});

describe("paintDraft", () => {
  it("sets the painted action's frequency", () => {
    const draft = paintDraft(draftFromStrings(["raise"], {}), cls("A5s"), "raise", 0.5);
    expect(draft.raise[cls("A5s")]).toBe(0.5);
  });

  it("does not change the draft it is given", () => {
    const before = draftFromStrings(["raise"], {});
    paintDraft(before, cls("A5s"), "raise", 1);
    expect(before.raise[cls("A5s")]).toBe(0);
  });

  it("shrinks the other actions so the frequencies never sum above 1", () => {
    const start = draftFromStrings(["raise", "call"], { call: "AJo:0.5", raise: "AJo:0.5" });
    const painted = paintDraft(start, cls("AJo"), "raise", 0.75);
    expect([painted.raise[cls("AJo")], painted.call[cls("AJo")]]).toEqual([0.75, 0.25]);
  });

  it("shares the room left between the other actions in proportion, rounded down", () => {
    const start = draftFromStrings(["raise", "call", "limp"], { call: "KQo:0.5", limp: "KQo:0.25", raise: "KQo:0.25" });
    const painted = paintDraft(start, cls("KQo"), "raise", 0.5);
    expect([painted.raise[cls("KQo")], painted.call[cls("KQo")], painted.limp[cls("KQo")]]).toEqual([0.5, 0.33, 0.16]);
  });

  it("paints the remainder by shrinking every written action", () => {
    const start = draftFromStrings(["raise", "call"], { call: "99:0.5", raise: "99:0.5" });
    const folded = paintDraft(start, cls("99"), "fold", 1);
    expect([folded.raise[cls("99")], folded.call[cls("99")]]).toEqual([0, 0]);
    const half = paintDraft(start, cls("99"), "fold", 0.5);
    expect([half.raise[cls("99")], half.call[cls("99")]]).toEqual([0.25, 0.25]);
  });
});

describe("draftStrings and draftSnippet", () => {
  it("round-trips through range strings", () => {
    const strings = { call: "JJ-77, AJo:0.5", raise: "QQ+, AJo:0.5" };
    const again = draftStrings(draftFromStrings(["raise", "call"], strings));
    expect(draftFromStrings(["raise", "call"], again)).toEqual(draftFromStrings(["raise", "call"], strings));
  });

  it("writes a Chart entry to paste into a Chart file", () => {
    const draft = draftFromStrings(["raise", "limp"], { limp: "22", raise: "AA" });
    expect(draftSnippet(draft)).toBe('{ raise: "AA", limp: "22" }');
  });
});
