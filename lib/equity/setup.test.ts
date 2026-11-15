import { describe, expect, it } from "vitest";
import { cardId, parseCards } from "@/lib/poker/card";
import { boardCodec, DEFAULT_PLAYERS, type EquitySetup, playersCodec, toEquityInput } from "./setup";

const cards = (text: string) => (parseCards(text) ?? []).map(cardId);

describe("playersCodec", () => {
  it("round-trips hands, ranges and random players", () => {
    const players = [
      { cards: cards("AsKd"), kind: "hand" as const },
      { kind: "range" as const, range: "QQ+, AKs, ATo:0.5" },
      { kind: "random" as const },
      { cards: cards("Qh"), kind: "hand" as const },
    ];
    const raw = playersCodec.serialize(players);
    expect(raw).toBe("AsKd_r.QQ+,AKs,ATo:0.5_*_Qh");
    expect(playersCodec.parse(raw)).toEqual([players[0], { kind: "range", range: "QQ+,AKs,ATo:0.5" }, players[2], players[3]]);
  });

  it("keeps the default (two empty hands) out of the URL", () => {
    expect(playersCodec.parse(null)).toEqual(DEFAULT_PLAYERS);
    expect(playersCodec.serialize(DEFAULT_PLAYERS)).toBeNull();
  });

  it("repairs malformed values: bad cards become empty hands, and 2 to 8 players", () => {
    expect(playersCodec.parse("AsAs_Zz")).toEqual(DEFAULT_PLAYERS);
    expect(playersCodec.parse("*")).toEqual([{ kind: "random" }, { cards: [], kind: "hand" }]);
    expect(playersCodec.parse(Array.from({ length: 10 }, () => "*").join("_"))).toHaveLength(8);
  });
});

describe("boardCodec", () => {
  it("reads up to five distinct cards", () => {
    expect(boardCodec.parse("AsKdQh")).toEqual(cards("AsKdQh"));
    expect(boardCodec.parse("AsAs")).toEqual([]);
    expect(boardCodec.parse("AsKdQhJcTs9s")).toEqual(cards("AsKdQhJcTs"));
    expect(boardCodec.serialize([])).toBeNull();
    expect(boardCodec.serialize(cards("AsKd"))).toBe("AsKd");
  });
});

describe("toEquityInput", () => {
  const setup = (players: EquitySetup["players"]): EquitySetup => ({ board: cards("Ah7d2c"), dead: cards("Kc"), players });

  it("builds the engine input once every player is complete", () => {
    const outcome = toEquityInput(setup([{ cards: cards("AsKd"), kind: "hand" }, { kind: "range", range: "QQ+" }, { kind: "random" }]));
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.reason));
    expect(outcome.input.board).toEqual(cards("Ah7d2c"));
    expect(outcome.input.dead).toEqual(cards("Kc"));
    expect(outcome.input.players[0]).toEqual({ cards: cards("AsKd"), kind: "hand" });
    const second = outcome.input.players[1];
    expect(second.kind === "range" && second.range.reduce((sum, weight) => sum + weight, 0)).toBe(18);
  });

  it("says what is missing", () => {
    expect(toEquityInput(setup([{ cards: cards("As"), kind: "hand" }, { kind: "random" }]))).toEqual({ ok: false, reason: { code: "pick-two", player: 0 } });
    expect(toEquityInput(setup([{ kind: "random" }, { kind: "range", range: "" }]))).toEqual({ ok: false, reason: { code: "paint", player: 1 } });
    expect(toEquityInput(setup([{ kind: "random" }, { kind: "range", range: "QQ+,ZZ" }]))).toEqual({
      ok: false,
      reason: { code: "range", error: { code: "invalid", entry: "ZZ" }, player: 1 },
    });
  });
});
