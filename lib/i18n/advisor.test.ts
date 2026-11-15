import { describe, expect, it } from "vitest";
import { opponentLineText, opponentNoteText, opponentProblemText, postflopReasonText, postflopUnavailableText, preflopProblemText } from "./advisor";

describe("preflopProblemText", () => {
  it("says what is wrong with the setup", () => {
    expect(preflopProblemText({ code: "no-stack" }, "en")).toBe("Enter your stack.");
    expect(preflopProblemText({ code: "no-position", players: 6, position: "UTG" }, "en")).toBe("There is no UTG at a 6-handed table.");
    expect(preflopProblemText({ code: "nobody-before", position: "UTG" }, "en")).toBe("Nobody acts before UTG.");
    expect(preflopProblemText({ code: "fewer-than-two", position: "UTG+1" }, "fr")).toBe("En UTG+1, moins de deux joueurs parlent avant toi.");
    expect(preflopProblemText({ code: "opener-first" }, "fr")).toBe("L’ouvreur doit parler avant toi.");
  });
});

describe("postflop text", () => {
  it("explains why there is no postflop", () => {
    expect(postflopUnavailableText({ code: "walk" }, "en")).toBe("Folded to you in the BB: you win the blinds.");
    expect(postflopUnavailableText({ code: "push-fold" }, "en")).toBe("Push/fold hands go all-in preflop, so there is no postflop decision.");
    expect(postflopUnavailableText({ code: "invalid", problem: { code: "pusher-first" } }, "en")).toBe("The pusher must act before you.");
  });

  it("words the verdict's reason", () => {
    expect(postflopReasonText({ code: "beats", equity: 0.3, needed: 0.25 }, "en")).toBe("30% equity beats the 25% the price needs.");
    expect(postflopReasonText({ code: "short", equity: 0.2, needed: 0.25 }, "fr")).toBe("20\u00a0% d’équité, c’est moins que les 25\u00a0% qu’exige la cote.");
    expect(postflopReasonText({ code: "low-spr", equity: 0.5, spr: 1.5 }, "en")).toBe("50% equity beats the price, and an SPR of 1.5 is too low to just call.");
  });

  it("words the opponent's line, notes and problems", () => {
    expect(opponentLineText("called-3-bet", "en")).toBe("called your 3-bet");
    expect(opponentLineText("called-your-open", "fr")).toBe("a callé ton open");
    expect(opponentNoteText({ code: "3-bet", position: "CO" }, "en")).toBe("No Chart covers calling a 3-bet, so this is CO's open Range.");
    expect(opponentNoteText({ code: "open-limp", position: "UTG", type: "tight" }, "en")).toBe(
      "Tight players never open-limp from UTG in the repo data, so this is their overlimp Range.",
    );
    expect(opponentNoteText({ code: "iso-raise" }, "en")).toBe("No Chart covers calling an iso-raise, so this is the Vs open call Range.");
    expect(opponentProblemText({ code: "folded-before", position: "HJ" }, "en")).toBe("HJ folded before the flop.");
    expect(opponentProblemText({ code: "never-line", position: "UTG", type: "tight" }, "fr")).toBe("Un joueur serré ne joue jamais ce coup en UTG.");
  });
});
