import { describe, expect, it } from "vitest";
import { codecs, withParam, withParams } from "./url-state";

describe("withParam", () => {
  it("sets a param and keeps the others", () => {
    expect(withParam("?a=1&b=2", "b", "3")).toBe("?a=1&b=3");
    expect(withParam("", "a", "1")).toBe("?a=1");
  });

  it("removes a param when the value is null", () => {
    expect(withParam("?a=1&b=2", "a", null)).toBe("?b=2");
    expect(withParam("?a=1", "a", null)).toBe("");
  });
});

describe("withParams", () => {
  it("sets and removes several params at once", () => {
    expect(withParams("?a=1&b=2&c=3", { a: null, b: "4", d: "5" })).toBe("?b=4&c=3&d=5");
    expect(withParams("?a=1", { a: null })).toBe("");
  });

  it("encodes range strings", () => {
    expect(new URLSearchParams(withParams("", { raise: "22+, AKs:0.5" })).get("raise")).toBe("22+, AKs:0.5");
  });
});

describe("codecs", () => {
  it("int falls back on missing or invalid values", () => {
    const stack = codecs.int(100);
    expect(stack.parse(null)).toBe(100);
    expect(stack.parse("abc")).toBe(100);
    expect(stack.parse("42")).toBe(42);
    expect(stack.serialize(42)).toBe("42");
  });

  it("int omits the default from the URL", () => {
    expect(codecs.int(100).serialize(100)).toBeNull();
  });

  it("oneOf only accepts listed values", () => {
    const position = codecs.oneOf(["UTG", "CO", "BTN"] as const, "BTN");
    expect(position.parse("CO")).toBe("CO");
    expect(position.parse("XX")).toBe("BTN");
    expect(position.serialize("BTN")).toBeNull();
  });

  it("string treats empty as default", () => {
    const board = codecs.string("");
    expect(board.parse(null)).toBe("");
    expect(board.serialize("")).toBeNull();
    expect(board.serialize("AsKd")).toBe("AsKd");
  });
});
