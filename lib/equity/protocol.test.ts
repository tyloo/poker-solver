import { describe, expect, it } from "vitest";
import { cardId, parseCards } from "@/lib/poker/card";
import { type EquityInput, seededRandom } from "./engine";
import { createEquityRunner, type EquityResponse } from "./protocol";

const cards = (text: string) => (parseCards(text) ?? []).map(cardId);

const turn: EquityInput = {
  board: cards("Jh9h2c5s"),
  dead: [],
  players: [
    { cards: cards("AhKh"), kind: "hand" },
    { cards: cards("QsQd"), kind: "hand" },
  ],
};
const preflop: EquityInput = { board: [], dead: [], players: [{ kind: "random" }, { kind: "random" }, { kind: "random" }] };

function setup(options: { tick?: number } = {}) {
  const messages: EquityResponse[] = [];
  let time = 0;
  const handle = createEquityRunner((message) => messages.push(message), {
    equity: { random: seededRandom(3) },
    now: () => {
      time += options.tick ?? 1;
      return time;
    },
    yieldToEvents: () => Promise.resolve(),
  });
  return { handle, messages };
}

describe("createEquityRunner", () => {
  it("answers a start with the final result", async () => {
    const { handle, messages } = setup();
    await handle({ id: 1, input: turn, type: "start" });
    expect(messages.at(-1)).toEqual({ id: 1, result: expect.objectContaining({ method: "exact", progress: 1, samples: 44 }), type: "done" });
    const done = messages.at(-1);
    if (done?.type !== "done") throw new Error("expected done");
    expect(done.result.players[0].equity).toBe(15 / 44);
  });

  it("reports input errors", async () => {
    const { handle, messages } = setup();
    await handle({ id: 4, input: { ...turn, board: cards("AhKd7c") }, type: "start" });
    expect(messages).toEqual([{ id: 4, message: "A♥ is used twice.", type: "error" }]);
  });

  it("reports input errors in the request's language", async () => {
    const { handle, messages } = setup();
    await handle({ id: 5, input: { ...turn, board: cards("AhKd7c") }, locale: "fr", type: "start" });
    expect(messages).toEqual([{ id: 5, message: "A♥ est utilisée deux fois.", type: "error" }]);
  });

  it("posts progress while a long job runs", async () => {
    const { handle, messages } = setup({ tick: 20 });
    await handle({ id: 2, input: preflop, type: "start" });
    const progress = messages.filter((message) => message.type === "progress");
    expect(progress.length).toBeGreaterThan(1);
    expect(messages.at(-1)?.type).toBe("done");
    expect(messages.every((message) => message.id === 2)).toBe(true);
  });

  it("drops a run when a newer start or a stop arrives", async () => {
    const { handle, messages } = setup({ tick: 20 });
    const first = handle({ id: 1, input: preflop, type: "start" });
    const second = handle({ id: 2, input: turn, type: "start" });
    await Promise.all([first, second]);
    expect(messages.filter((message) => message.type === "done").map((message) => message.id)).toEqual([2]);

    const third = handle({ id: 3, input: preflop, type: "start" });
    const stop = handle({ type: "stop" });
    await Promise.all([third, stop]);
    expect(messages.some((message) => message.id === 3 && message.type === "done")).toBe(false);
  });
});
