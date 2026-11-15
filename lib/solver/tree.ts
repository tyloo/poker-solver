import { CARD_COUNT, type CardId } from "@/lib/poker/card";
import { DEFAULT_MAX_RAISES, type Player, type Spot } from "./spot";

export type ActionKind = "fold" | "check" | "call" | "bet" | "raise" | "allin";

/** `to` is the player's chips in on this street after the action, `amount` what the action adds. */
export type SolverAction = { kind: ActionKind; to: number; amount: number };

/** `invested` is each player's chips put in since the start of the Spot. */
type NodeBase = { board: readonly CardId[]; invested: readonly [number, number] };

export type ActionNode = NodeBase & { kind: "action"; id: number; player: Player; actions: readonly SolverAction[]; children: TreeNode[] };
/** Deals one card; `children[i]` follows `cards[i]`. */
export type ChanceNode = NodeBase & { kind: "chance"; cards: readonly CardId[]; children: TreeNode[] };
export type FoldNode = NodeBase & { kind: "fold"; folder: Player };
/** `runout` indexes `GameTree.runouts`, the distinct five-card boards. */
export type ShowdownNode = NodeBase & { kind: "showdown"; runout: number };
export type TreeNode = ActionNode | ChanceNode | FoldNode | ShowdownNode;

export type TreeStats = {
  actionNodes: number;
  chanceNodes: number;
  terminalNodes: number;
  /** Sum of the action counts over each player's decisions (storage is this × the player's Combos). */
  actionSlots: [number, number];
  /** Distinct five-card boards reached. */
  runouts: number;
};

export type GameTree = {
  root: TreeNode;
  pot: number;
  stack: number;
  /** Indexed by `ActionNode.id`. */
  actionNodes: ActionNode[];
  runouts: (readonly CardId[])[];
  stats: TreeStats;
};

/** A size that would leave less than this share of the pot (after a call) behind becomes all-in. */
const FORCE_ALL_IN = 0.15;

type Invested = readonly [number, number];
type Next = { kind: "decision"; invested: Invested; player: Player; raises: number } | { kind: "fold"; folder: Player } | { kind: "close"; invested: Invested };
type Edge = { action: SolverAction; next: Next };

/** The actions at one decision. In a flop Spot every raise is all-in only. */
function decisionEdges(spot: Spot, invested: Invested, streetStart: number, player: Player, raises: number): Edge[] {
  const stack = spot.effectiveStack;
  const opponent: Player = player === 0 ? 1 : 0;
  const edges: Edge[] = [];
  const after = (total: number): Invested => (player === 0 ? [total, invested[1]] : [invested[0], total]);
  const push = (kind: ActionKind, total: number, next: Next) => edges.push({ action: { amount: total - invested[player], kind, to: total - streetStart }, next });
  const pushSized = (kind: "bet" | "raise", totals: number[], nextRaises: number) => {
    const sized = totals.map((total) => (total >= stack || stack - total <= FORCE_ALL_IN * (spot.pot + 2 * total) ? stack : total));
    for (const total of [...new Set([...sized, stack])].sort((a, b) => a - b)) {
      push(total === stack ? "allin" : kind, total, { invested: after(total), kind: "decision", player: opponent, raises: nextRaises });
    }
  };

  if (invested[opponent] === invested[player]) {
    push("check", invested[player], player === 0 ? { invested, kind: "decision", player: 1, raises } : { invested, kind: "close" });
    const pot = spot.pot + invested[0] + invested[1];
    pushSized(
      "bet",
      spot.betSizes.map((size) => invested[player] + Math.max(1, Math.round(size * pot))),
      raises,
    );
    return edges;
  }
  push("fold", invested[player], { folder: player, kind: "fold" });
  push("call", invested[opponent], { invested: after(invested[opponent]), kind: "close" });
  if (raises < (spot.maxRaises ?? DEFAULT_MAX_RAISES) && stack > invested[opponent]) {
    const facing = invested[opponent] - streetStart;
    const sizes = spot.board.length === 3 ? [] : spot.raiseSizes;
    pushSized(
      "raise",
      sizes.map((size) => streetStart + Math.round(Math.max(size, 2) * facing)),
      raises + 1,
    );
  }
  return edges;
}

export function buildTree(spot: Spot): GameTree {
  const stack = spot.effectiveStack;
  const actionNodes: ActionNode[] = [];
  const runouts: (readonly CardId[])[] = [];
  const runoutIndex = new Map<string, number>();
  const stats: TreeStats = { actionNodes: 0, actionSlots: [0, 0], chanceNodes: 0, runouts: 0, terminalNodes: 0 };

  function closeStreet(board: readonly CardId[], invested: Invested): TreeNode {
    if (board.length === 5) {
      stats.terminalNodes++;
      const key = [...board].sort((a, b) => a - b).join();
      let runout = runoutIndex.get(key);
      if (runout === undefined) {
        runout = runouts.length;
        runouts.push(board);
        runoutIndex.set(key, runout);
      }
      return { board, invested, kind: "showdown", runout };
    }
    stats.chanceNodes++;
    const cards: CardId[] = [];
    const children: TreeNode[] = [];
    for (let card = 0; card < CARD_COUNT; card++) {
      if (board.includes(card)) continue;
      cards.push(card);
      children.push(openStreet([...board, card], invested));
    }
    return { board, cards, children, invested, kind: "chance" };
  }

  function openStreet(board: readonly CardId[], invested: Invested): TreeNode {
    return stack - invested[0] > 0 ? decision(board, invested, invested[0], 0, 0) : closeStreet(board, invested);
  }

  function decision(board: readonly CardId[], invested: Invested, streetStart: number, player: Player, raises: number): ActionNode {
    const edges = decisionEdges(spot, invested, streetStart, player, raises);
    const node: ActionNode = { actions: edges.map((edge) => edge.action), board, children: [], id: actionNodes.length, invested, kind: "action", player };
    actionNodes.push(node);
    stats.actionNodes++;
    stats.actionSlots[player] += edges.length;
    for (const { next } of edges) {
      if (next.kind === "decision") node.children.push(decision(board, next.invested, streetStart, next.player, next.raises));
      else if (next.kind === "close") node.children.push(closeStreet(board, next.invested));
      else {
        stats.terminalNodes++;
        node.children.push({ board, folder: next.folder, invested, kind: "fold" });
      }
    }
    return node;
  }

  const root = openStreet(spot.board, [0, 0]);
  stats.runouts = runouts.length;
  return { actionNodes, pot: spot.pot, root, runouts, stack, stats };
}

/** The stats `buildTree` would report, counted without building the tree (chance children share one shape). */
export function countTree(spot: Spot): TreeStats {
  const stack = spot.effectiveStack;
  type Counts = [actions: number, chances: number, terminals: number, slots0: number, slots1: number];
  const add = (into: Counts, from: Counts, times = 1) => {
    for (let i = 0; i < 5; i++) into[i] += from[i] * times;
  };

  function closeStreet(street: number, invested: Invested): Counts {
    if (street === 5) return [0, 0, 1, 0, 0];
    const counts: Counts = [0, 1, 0, 0, 0];
    add(counts, openStreet(street + 1, invested), CARD_COUNT - street);
    return counts;
  }

  function openStreet(street: number, invested: Invested): Counts {
    return stack - invested[0] > 0 ? decision(street, invested, invested[0], 0, 0) : closeStreet(street, invested);
  }

  function decision(street: number, invested: Invested, streetStart: number, player: Player, raises: number): Counts {
    const edges = decisionEdges(spot, invested, streetStart, player, raises);
    const counts: Counts = [1, 0, 0, 0, 0];
    counts[3 + player] = edges.length;
    for (const { next } of edges) {
      if (next.kind === "decision") add(counts, decision(street, next.invested, streetStart, next.player, next.raises));
      else if (next.kind === "close") add(counts, closeStreet(street, next.invested));
      else counts[2]++;
    }
    return counts;
  }

  const [actionNodes, chanceNodes, terminalNodes, slots0, slots1] = openStreet(spot.board.length, [0, 0]);
  const unseen = CARD_COUNT - spot.board.length;
  const runouts = spot.board.length === 5 ? 1 : spot.board.length === 4 ? unseen : (unseen * (unseen - 1)) / 2;
  return { actionNodes, actionSlots: [slots0, slots1], chanceNodes, runouts, terminalNodes };
}
