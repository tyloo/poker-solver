import { describe, expect, it } from "vitest";
import { validateSpot } from "./spot";
import { spot } from "./test-helpers";
import { type ActionNode, buildTree, countTree, type TreeNode } from "./tree";

const river = (fields: Partial<Parameters<typeof spot>[0]> = {}) => spot({ board: "Qs Jh 7d 4c 2s", ip: "KK", oop: "QQ, 65s", ...fields });

const labels = (node: TreeNode) => (node as ActionNode).actions.map((action) => `${action.kind} ${action.to}`);

function walk(node: TreeNode, path: number[]): TreeNode {
  let current = node;
  for (const step of path) {
    if (current.kind !== "action" && current.kind !== "chance") throw new Error("Path walks past a terminal");
    current = current.children[step];
  }
  return current;
}

describe("buildTree", () => {
  it("offers check, each pot-fraction bet and all-in at the first decision", () => {
    const tree = buildTree(river());
    expect(tree.root.kind).toBe("action");
    expect((tree.root as ActionNode).player).toBe(0);
    expect(labels(tree.root)).toEqual(["check 0", "bet 33", "bet 75", "allin 1000"]);
  });

  it("offers fold, call, the raise multiples and all-in facing a bet", () => {
    const tree = buildTree(river());
    const facing = walk(tree.root, [1]);
    expect((facing as ActionNode).player).toBe(1);
    expect(labels(facing)).toEqual(["fold 0", "call 33", "raise 99", "allin 1000"]);
    const afterRaise = walk(tree.root, [1, 2]);
    expect(labels(afterRaise)).toEqual(["fold 33", "call 99", "raise 297", "allin 1000"]);
    expect((afterRaise as ActionNode).actions[1].amount).toBe(66);
  });

  it("lets the in-position player bet after a check, then closes the street", () => {
    const tree = buildTree(river());
    expect(labels(walk(tree.root, [0]))).toEqual(["check 0", "bet 33", "bet 75", "allin 1000"]);
    expect(walk(tree.root, [0, 0]).kind).toBe("showdown");
    expect(walk(tree.root, [0, 1, 1]).kind).toBe("showdown");
    const fold = walk(tree.root, [0, 1, 0]);
    expect(fold.kind).toBe("fold");
    expect(fold.kind === "fold" && fold.folder).toBe(0);
    expect(walk(tree.root, [0, 1, 1]).invested).toEqual([33, 33]);
  });

  it("turns sizes at or above the stack into one all-in", () => {
    const tree = buildTree(river({ effectiveStack: 60 }));
    expect(labels(tree.root)).toEqual(["check 0", "bet 33", "allin 60"]);
    expect(labels(walk(tree.root, [1]))).toEqual(["fold 0", "call 33", "allin 60"]);
  });

  it("forces all-in when a size would leave a stack under 15% of the pot after a call", () => {
    expect(labels(buildTree(river({ effectiveStack: 120 })).root)).toEqual(["check 0", "bet 33", "bet 75", "allin 120"]);
    expect(labels(buildTree(river({ effectiveStack: 100 })).root)).toEqual(["check 0", "bet 33", "allin 100"]);
  });

  it("enforces the 2× minimum raise", () => {
    const tree = buildTree(river({ raiseSizes: [1.5] }));
    expect(labels(walk(tree.root, [1]))).toEqual(["fold 0", "call 33", "raise 66", "allin 1000"]);
  });

  it("caps the raises per street", () => {
    const tree = buildTree(river({ maxRaises: 1 }));
    expect(labels(walk(tree.root, [1, 2]))).toEqual(["fold 33", "call 99"]);
    expect(labels(walk(tree.root, [3]))).toEqual(["fold 0", "call 1000"]);
  });

  it("builds Kuhn poker from a 2-chip pot and a 1-chip stack", () => {
    const tree = buildTree(river({ betSizes: [0.5], effectiveStack: 1, pot: 2 }));
    expect(labels(tree.root)).toEqual(["check 0", "allin 1"]);
    expect(labels(walk(tree.root, [0]))).toEqual(["check 0", "allin 1"]);
    expect(labels(walk(tree.root, [0, 1]))).toEqual(["fold 0", "call 1"]);
    expect(labels(walk(tree.root, [1]))).toEqual(["fold 0", "call 1"]);
    expect(tree.stats.actionNodes).toBe(4);
  });

  it("deals every unseen river card after the turn betting closes", () => {
    const tree = buildTree(spot({ board: "QsJh7d4c", ip: "KK", oop: "QQ" }));
    const chance = walk(tree.root, [0, 0]);
    expect(chance.kind).toBe("chance");
    if (chance.kind !== "chance") return;
    expect(chance.cards).toHaveLength(48);
    expect(chance.children).toHaveLength(48);
    const riverRoot = chance.children[0];
    expect(riverRoot.kind).toBe("action");
    expect(riverRoot.board).toHaveLength(5);
    expect(riverRoot.board[4]).toBe(chance.cards[0]);
    expect((riverRoot as ActionNode).player).toBe(0);
  });

  it("runs the board out without betting once a player is all-in", () => {
    const tree = buildTree(spot({ board: "QsJh7d4c", ip: "KK", oop: "QQ" }));
    const chance = walk(tree.root, [3, 1]);
    expect(chance.kind).toBe("chance");
    if (chance.kind !== "chance") return;
    expect(chance.children.every((child) => child.kind === "showdown")).toBe(true);
    expect(chance.children[0].invested).toEqual([1000, 1000]);
  });

  it("skips betting entirely when nobody has chips behind", () => {
    const tree = buildTree(spot({ board: "QsJh7d4c", effectiveStack: 0, ip: "KK", oop: "QQ" }));
    expect(tree.root.kind).toBe("chance");
    expect(tree.stats.actionNodes).toBe(0);
  });

  it("allows only all-in raises on every street of a flop Spot", () => {
    const tree = buildTree(spot({ betSizes: [0.5], board: "QsJh7d", effectiveStack: 1000, ip: "KK", oop: "QQ" }));
    expect(labels(tree.root)).toEqual(["check 0", "bet 50", "allin 1000"]);
    expect(labels(walk(tree.root, [1]))).toEqual(["fold 0", "call 50", "allin 1000"]);
    const turn = walk(tree.root, [1, 1, 0]);
    expect(turn.board).toHaveLength(4);
    expect(labels(walk(turn, [1]))).toEqual(["fold 0", "call 100", "allin 950"]);
  });

  it("keeps the raise sizes in turn Spots", () => {
    const tree = buildTree(spot({ betSizes: [0.5], board: "QsJh7d4c", effectiveStack: 1000, ip: "KK", oop: "QQ" }));
    expect(labels(walk(tree.root, [1]))).toEqual(["fold 0", "call 50", "raise 150", "allin 1000"]);
  });

  it("counts the same stats without building the tree", () => {
    for (const fields of [
      { board: "QsJh7d4c2s" },
      { board: "QsJh7d4c" },
      { board: "QsJh7d4c", effectiveStack: 0 },
      { board: "QsJh7d4c", effectiveStack: 250, maxRaises: 1 },
      { betSizes: [0.75], board: "QsJh7d", effectiveStack: 300 },
    ]) {
      const current = spot({ ip: "KK", oop: "QQ", ...fields });
      expect(countTree(current)).toEqual(buildTree(current).stats);
    }
  });

  it("dedupes river boards reached by different turn lines", () => {
    const tree = buildTree(spot({ board: "QsJh7d4c", ip: "KK", oop: "QQ" }));
    expect(tree.runouts).toHaveLength(48);
    const flop = buildTree(spot({ betSizes: [0.5], board: "QsJh7d", effectiveStack: 50, ip: "KK", oop: "QQ" }));
    expect(flop.runouts).toHaveLength((49 * 48) / 2);
  });
});

describe("validateSpot", () => {
  it("accepts a turn Spot", () => {
    expect(validateSpot(spot({ board: "QsJh7d4c", ip: "KK", oop: "QQ" }))).toBeNull();
  });

  it("limits flop Spots to one bet size plus all-in", () => {
    expect(validateSpot(spot({ board: "QsJh7d", ip: "KK", oop: "QQ" }))).toEqual({ code: "flop-one-bet" });
    expect(validateSpot(spot({ betSizes: [0.5], board: "QsJh7d", ip: "KK", oop: "QQ" }))).toBeNull();
  });

  it("rejects bad boards, pots, stacks, sizes and empty Ranges", () => {
    expect(validateSpot(spot({ board: "QsJh", ip: "KK", oop: "QQ" }))).toEqual({ code: "board-cards" });
    expect(validateSpot({ ...spot({ board: "QsJh7d4c", ip: "KK", oop: "QQ" }), board: [1, 1, 2, 3] })).toEqual({ code: "bad-card" });
    expect(validateSpot(spot({ board: "QsJh7d4c", ip: "KK", oop: "QQ", pot: 0 }))).toEqual({ code: "pot" });
    expect(validateSpot(spot({ board: "QsJh7d4c", effectiveStack: -1, ip: "KK", oop: "QQ" }))).toEqual({ code: "stack" });
    expect(validateSpot(spot({ betSizes: [0], board: "QsJh7d4c", ip: "KK", oop: "QQ" }))).toEqual({ code: "bet-sizes" });
    expect(validateSpot(spot({ board: "QsJh7d4c", ip: "KK", oop: "QQ", raiseSizes: [1] }))).toEqual({ code: "raise-sizes" });
    expect(validateSpot(spot({ board: "QsQhQd4c", ip: "KK", oop: "QQ" }))).toEqual({ code: "empty-range", player: 0 });
    expect(validateSpot(spot({ board: "KsKhKd4c", ip: "KK", oop: "QQ" }))).toEqual({ code: "empty-range", player: 1 });
  });
});
