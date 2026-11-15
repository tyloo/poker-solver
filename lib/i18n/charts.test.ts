import { describe, expect, it } from "vitest";
import { describeChart, describePushFold, describeSituation, spansText } from "./charts";

describe("describeChart", () => {
  it("names the Chart in plain words", () => {
    expect(describeChart({ position: "CO", situation: "open", tier: "40bb+" }, "en")).toBe("CO open, 40bb+");
    expect(describeChart({ opener: "late", position: "BB", situation: "vs-open", tier: "15-20bb" }, "en")).toBe("BB vs late open, 15–20bb");
    expect(describeChart({ limpers: "2+", position: "SB", situation: "vs-limpers", tier: "25bb" }, "en")).toBe("SB vs 2+ limpers, 25bb");
    expect(describeChart({ limpers: "1", position: "BTN", situation: "vs-limpers", tier: "25bb" }, "en")).toBe("BTN vs 1 limper, 25bb");
  });

  it("names the Chart in French", () => {
    expect(describeChart({ position: "CO", situation: "open", tier: "40bb+" }, "fr")).toBe("Open en CO, 40bb+");
    expect(describeChart({ opener: "late", position: "BB", situation: "vs-open", tier: "15-20bb" }, "fr")).toBe("BB face à un open en fin de parole, 15–20bb");
    expect(describeChart({ limpers: "2+", position: "SB", situation: "vs-limpers", tier: "25bb" }, "fr")).toBe("SB face à 2+ limpers, 25bb");
  });

  it("names the Situation alone, for Ranges that do not depend on the Stack tier", () => {
    expect(describeSituation({ opener: "late", position: "BB", situation: "vs-open", tier: "15-20bb" }, "en")).toBe("BB vs late open");
    expect(describeSituation({ limpers: "1", position: "BTN", situation: "vs-limpers", tier: "25bb" }, "fr")).toBe("BTN face à 1 limper");
  });
});

describe("describePushFold", () => {
  it("names series and Charts in plain words", () => {
    expect(describePushFold({ position: "CO", situation: "push" }, "en")).toBe("CO push");
    expect(describePushFold({ depth: 8, position: "BB", pusher: "late", situation: "vs-push" }, "en")).toBe("BB vs late push, 8bb");
    expect(describePushFold({ depth: 8, position: "BB", pusher: "late", situation: "vs-push" }, "fr")).toBe("BB face à un push en fin de parole, 8bb");
  });
});

describe("spansText", () => {
  it("lists depth spans with the language's conjunction", () => {
    expect(spansText([[1, 11]], "en")).toBe("1–11bb");
    expect(
      spansText(
        [
          [1, 2],
          [5, 7],
        ],
        "en",
      ),
    ).toBe("1–2bb and 5–7bb");
    expect(
      spansText(
        [
          [1, 1],
          [4, 4],
          [9, 15],
        ],
        "fr",
      ),
    ).toBe("1bb, 4bb et 9–15bb");
    expect(spansText([], "en")).toBe("");
  });
});
