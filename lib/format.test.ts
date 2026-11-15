import { describe, expect, it } from "vitest";
import { formatBb, formatList, formatNumber, formatPercent } from "./format";

// French groups thousands with a narrow no-break space and puts a no-break space before the percent sign (CLDR).
const NNBSP = "\u202f";
const NBSP = "\u00a0";

describe("formatPercent", () => {
  it("writes English percentages", () => {
    expect(formatPercent(0.704, "en")).toBe("70%");
    expect(formatPercent(0.819, "en", 1)).toBe("81.9%");
    expect(formatPercent(1, "en")).toBe("100%");
    expect(formatPercent(0, "en", 1)).toBe("0.0%");
  });

  it("writes French percentages", () => {
    expect(formatPercent(0.819, "fr", 1)).toBe(`81,9${NBSP}%`);
    expect(formatPercent(0.5, "fr")).toBe(`50${NBSP}%`);
  });
});

describe("formatNumber", () => {
  it("groups thousands", () => {
    expect(formatNumber(12500, "en")).toBe("12,500");
    expect(formatNumber(12500, "fr")).toBe(`12${NNBSP}500`);
  });

  it("keeps up to the given decimals and drops trailing zeros", () => {
    expect(formatNumber(2.5, "en", 2)).toBe("2.5");
    expect(formatNumber(2.5, "fr", 2)).toBe("2,5");
    expect(formatNumber(1.826, "fr", 2)).toBe("1,83");
    expect(formatNumber(3, "fr", 2)).toBe("3");
  });

  it("leaves thousands ungrouped on request, for text fields", () => {
    expect(formatNumber(1500.5, "en", 2, 0, false)).toBe("1500.5");
    expect(formatNumber(1500.5, "fr", 2, 0, false)).toBe("1500,5");
  });

  it("writes bb amounts", () => {
    expect(formatBb(2.5, "en")).toBe("2.5bb");
    expect(formatBb(7.5, "fr")).toBe("7,5bb");
  });
});

describe("formatList", () => {
  it("joins with the language's last conjunction", () => {
    expect(formatList(["CO", "BTN", "SB"], "en")).toBe("CO, BTN and SB");
    expect(formatList(["1–2bb", "5–7bb"], "en")).toBe("1–2bb and 5–7bb");
    expect(formatList(["CO", "BTN", "SB"], "fr")).toBe("CO, BTN et SB");
    expect(formatList(["LJ"], "fr")).toBe("LJ");
  });
});
