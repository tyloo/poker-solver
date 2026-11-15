import { CARD_COUNT, type CardId } from "@/lib/poker/card";
import { COMBO_HAND_CLASS, HAND_CLASS_COUNT } from "@/lib/poker/combo";
import { estimateSpot, overBudgetMessage, type SpotEstimate } from "./estimate";
import { createHandSet, foldValues, type HandSet, type Ranking, rankHands, sameComboIndex, showdownValues } from "./evaluation";
import type { Player, Spot } from "./spot";
import { type ActionNode, buildTree, type ChanceNode, type GameTree, type SolverAction, type TreeNode } from "./tree";

/** Per Hand class (indexed by HandClassId): NaN where the class has no reach. */
export type HandClassView = {
  /** Reach-weighted Combo count. */
  combos: Float64Array;
  ev: Float64Array;
  equity: Float64Array;
  /** `actions × 169`, action-major, for the player to act. */
  strategy: Float64Array | null;
};

/** One player's Range at a node. Per-Combo arrays follow `combos`; NaN where a Combo has no reach. */
export type RangeView = {
  combos: Uint16Array;
  /** Probability (times the starting weight) that the player holds each Combo here. */
  reach: Float64Array;
  /** Chips the Combo expects to win from the pot from here on, minus what it still puts in. */
  ev: Float64Array;
  /** Showdown equity against the opponent's Range here, over all runouts. */
  equity: Float64Array;
  /** `actions × combos`, action-major: the average strategy of the player to act. */
  strategy: Float64Array | null;
  handClasses: HandClassView;
  total: { combos: number; ev: number; equity: number };
};

/** A node of the solved tree, as the UI reads it. `path` lists action indexes and, at chance nodes, card indexes. */
export type NodeView = {
  path: number[];
  kind: TreeNode["kind"];
  board: CardId[];
  pot: number;
  stacks: [number, number];
  player: Player | null;
  actions: SolverAction[];
  cards: CardId[];
  folder: Player | null;
  ranges: [RangeView, RangeView];
};

export type SolverOptions = { budgetBytes?: number };

const TRAIN = 0;
const BEST_RESPONSE = 1;
const AVERAGE = 2;
type Mode = typeof TRAIN | typeof BEST_RESPONSE | typeof AVERAGE;

type Frame = {
  strategy: Float64Array;
  sums: Float64Array;
  values: [Float64Array[], Float64Array[]];
  reach: [Float64Array, Float64Array];
  out: [Float64Array, Float64Array];
};

const other = (player: Player): Player => (player === 0 ? 1 : 0);
const runoutKey = (board: readonly CardId[]) => [...board].sort((a, b) => a - b).join();
/** For a pair of disjoint hands, how many of the unseen cards can come next. */
const chanceFactor = (board: readonly CardId[]) => CARD_COUNT - board.length - 4;

/**
 * Discounted CFR (Brown & Sandholm 2019, α = 1.5, β = 0, γ = 2) with alternating updates over
 * whole-range vectors. Internal values are zero-sum chips: each player owns half the starting pot.
 * Views report EV as the chips a hand expects to take from the pot, minus what it still puts in.
 */
export class Solver {
  readonly spot: Spot;
  readonly tree: GameTree;
  readonly hands: readonly [HandSet, HandSet];
  readonly estimate: SpotEstimate;
  iteration = 0;

  private readonly same: [Int32Array, Int32Array];
  private readonly rankings: [Ranking[], Ranking[]];
  private readonly runoutIds: Map<string, number>;
  private readonly offsets: Int32Array;
  private readonly regrets: [Float32Array, Float32Array];
  private readonly strategySum: [Float32Array, Float32Array];
  private readonly frames: Frame[];
  private readonly rootOut: [Float64Array, Float64Array];
  /** Weight of all compatible starting hand pairs. */
  private readonly combinations: number;
  private alpha = 0;
  private gamma = 0;

  constructor(spot: Spot, options: SolverOptions = {}) {
    const sized = estimateSpot(spot, options.budgetBytes);
    if (!sized.ok) throw new Error(sized.error);
    if (!sized.estimate.fits) throw new Error(overBudgetMessage(sized.estimate));
    this.estimate = sized.estimate;
    this.spot = spot;
    this.tree = buildTree(spot);
    const hands: [HandSet, HandSet] = [createHandSet(spot.ranges[0], spot.board), createHandSet(spot.ranges[1], spot.board)];
    this.hands = hands;
    this.same = [sameComboIndex(hands[0], hands[1]), sameComboIndex(hands[1], hands[0])];

    const sizes = [0, 0];
    this.offsets = new Int32Array(this.tree.actionNodes.length);
    let maxActions = 1;
    for (const node of this.tree.actionNodes) {
      this.offsets[node.id] = sizes[node.player];
      sizes[node.player] += node.actions.length * hands[node.player].combos.length;
      maxActions = Math.max(maxActions, node.actions.length);
    }
    this.regrets = [new Float32Array(sizes[0]), new Float32Array(sizes[1])];
    this.strategySum = [new Float32Array(sizes[0]), new Float32Array(sizes[1])];

    this.runoutIds = new Map(this.tree.runouts.map((runout, index) => [runoutKey(runout), index]));
    this.rankings = [this.tree.runouts.map((runout) => rankHands(hands[0], runout)), this.tree.runouts.map((runout) => rankHands(hands[1], runout))];

    const n = Math.max(hands[0].combos.length, hands[1].combos.length);
    const frame = (): Frame => {
      const views = (player: Player) => {
        const size = hands[player].combos.length;
        const buffer = new Float64Array(maxActions * size);
        return Array.from({ length: maxActions }, (_, a) => buffer.subarray(a * size, (a + 1) * size));
      };
      const vector = (player: Player) => new Float64Array(hands[player].combos.length);
      return { out: [vector(0), vector(1)], reach: [vector(0), vector(1)], strategy: new Float64Array(maxActions * n), sums: new Float64Array(n), values: [views(0), views(1)] };
    };
    this.frames = Array.from({ length: depth(this.tree.root) + 1 }, frame);
    this.rootOut = [new Float64Array(hands[0].combos.length), new Float64Array(hands[1].combos.length)];

    const compatible = new Float64Array(hands[0].combos.length);
    foldValues(compatible, hands[0], hands[1], hands[1].weights, this.same[0], 1);
    this.combinations = dot(hands[0].weights, compatible);
    if (!(this.combinations > 0)) throw new Error("The two Ranges block each other completely");
  }

  iterate(count = 1): void {
    for (let k = 0; k < count; k++) {
      const t = ++this.iteration;
      const power = t ** 1.5;
      this.alpha = power / (power + 1);
      this.gamma = (t / (t + 1)) ** 2;
      for (const player of [0, 1] as const) {
        this.traverse(this.tree.root, TRAIN, player, this.hands[other(player)].weights, this.hands[player].weights, this.rootOut[player], 0);
      }
    }
  }

  /** Mean gain of a best response against the average strategy, in chips per hand (0 at equilibrium). */
  exploitability(): number {
    return (this.bestResponse(0) + this.bestResponse(1)) / 2;
  }

  /** Best-response EV of `player` against the opponent's average strategy, in chips per hand, zero-sum. */
  bestResponse(player: Player): number {
    const out = this.rootOut[player];
    this.traverse(this.tree.root, BEST_RESPONSE, player, this.hands[other(player)].weights, this.hands[player].weights, out, 0);
    return dot(this.hands[player].weights, out) / this.combinations;
  }

  /** The node reached by `path` under the current average strategy; throws on an invalid path. */
  view(path: readonly number[]): NodeView {
    const { node, reach } = this.walk(path);
    const ranges = [0, 1].map((player) => this.rangeView(node, player as Player, reach)) as [RangeView, RangeView];
    const { pot, stack } = this.tree;
    return {
      actions: node.kind === "action" ? [...node.actions] : [],
      board: [...node.board],
      cards: node.kind === "chance" ? [...node.cards] : [],
      folder: node.kind === "fold" ? node.folder : null,
      kind: node.kind,
      path: [...path],
      player: node.kind === "action" ? node.player : null,
      pot: pot + node.invested[0] + node.invested[1],
      ranges,
      stacks: [stack - node.invested[0], stack - node.invested[1]],
    };
  }

  private walk(path: readonly number[]): { node: TreeNode; reach: [Float64Array, Float64Array] } {
    let node = this.tree.root;
    const reach: [Float64Array, Float64Array] = [this.hands[0].weights.slice(), this.hands[1].weights.slice()];
    path.forEach((step, depth) => {
      if ((node.kind !== "action" && node.kind !== "chance") || !Number.isInteger(step) || step < 0 || step >= node.children.length) {
        throw new Error(`Invalid tree path at step ${depth + 1}`);
      }
      if (node.kind === "action") {
        const n = this.hands[node.player].combos.length;
        const strategy = new Float64Array(node.actions.length * n);
        this.strategy(node, this.strategySum[node.player], strategy, new Float64Array(n));
        const own = reach[node.player];
        for (let h = 0; h < n; h++) own[h] *= strategy[step * n + h];
      } else {
        for (const player of [0, 1] as const) for (const h of this.hands[player].withCard[node.cards[step]]) reach[player][h] = 0;
      }
      node = node.children[step];
    });
    return { node, reach };
  }

  private rangeView(node: TreeNode, player: Player, reach: [Float64Array, Float64Array]): RangeView {
    const hands = this.hands[player];
    const n = hands.combos.length;
    const opponent = other(player);
    const own = reach[player];
    const cfv = new Float64Array(n);
    this.traverse(node, AVERAGE, player, reach[opponent], own, cfv, 0);
    const compatible = new Float64Array(n);
    foldValues(compatible, hands, this.hands[opponent], reach[opponent], this.same[player], 1);
    const equityValue = new Float64Array(n);
    this.equityValues(node.board, player, reach[opponent], equityValue);

    let strategy: Float64Array | null = null;
    const actions = node.kind === "action" ? node.actions.length : 0;
    if (node.kind === "action" && node.player === player) {
      strategy = new Float64Array(actions * n);
      this.strategy(node, this.strategySum[player], strategy, new Float64Array(n));
    }

    const invested = this.spot.pot / 2 + node.invested[player];
    const ev = new Float64Array(n).fill(Number.NaN);
    const equity = new Float64Array(n).fill(Number.NaN);
    const classes: HandClassView = {
      combos: new Float64Array(HAND_CLASS_COUNT),
      equity: new Float64Array(HAND_CLASS_COUNT),
      ev: new Float64Array(HAND_CLASS_COUNT),
      strategy: strategy ? new Float64Array(actions * HAND_CLASS_COUNT) : null,
    };
    const classWeight = new Float64Array(HAND_CLASS_COUNT);
    const total = { combos: 0, equity: 0, ev: 0 };
    let totalWeight = 0;
    for (let h = 0; h < n; h++) {
      const r = own[h];
      if (r === 0) continue;
      const cls = COMBO_HAND_CLASS[hands.combos[h]];
      classes.combos[cls] += r;
      total.combos += r;
      if (strategy && classes.strategy) {
        for (let a = 0; a < actions; a++) classes.strategy[a * HAND_CLASS_COUNT + cls] += r * strategy[a * n + h];
      }
      if (compatible[h] === 0) continue;
      ev[h] = cfv[h] / compatible[h] + invested;
      equity[h] = equityValue[h] / compatible[h];
      const weight = r * compatible[h];
      classWeight[cls] += weight;
      classes.ev[cls] += weight * ev[h];
      classes.equity[cls] += r * equityValue[h];
      totalWeight += weight;
      total.ev += weight * ev[h];
      total.equity += r * equityValue[h];
    }
    for (let cls = 0; cls < HAND_CLASS_COUNT; cls++) {
      const weight = classWeight[cls];
      classes.ev[cls] = weight > 0 ? classes.ev[cls] / weight : Number.NaN;
      classes.equity[cls] = weight > 0 ? classes.equity[cls] / weight : Number.NaN;
      if (!classes.strategy) continue;
      for (let a = 0; a < actions; a++) {
        const index = a * HAND_CLASS_COUNT + cls;
        classes.strategy[index] = classes.combos[cls] > 0 ? classes.strategy[index] / classes.combos[cls] : Number.NaN;
      }
    }
    total.ev = totalWeight > 0 ? total.ev / totalWeight : Number.NaN;
    total.equity = totalWeight > 0 ? total.equity / totalWeight : Number.NaN;
    return { combos: hands.combos.slice(), equity, ev, handClasses: classes, reach: own.slice(), strategy, total };
  }

  /** Showdown equity values (win + tie / 2, weighted by compatible opponent reach) over all runouts of `board`. */
  private equityValues(board: readonly CardId[], player: Player, oppReach: Float64Array, out: Float64Array): void {
    const opponent = other(player);
    if (board.length === 5) {
      const runout = this.runoutIds.get(runoutKey(board));
      if (runout === undefined) throw new Error("Unknown runout");
      showdownValues(out, this.rankings[player][runout], this.rankings[opponent][runout], oppReach, this.same[player], 1, 0, 0.5);
      return;
    }
    out.fill(0);
    const child = new Float64Array(out.length);
    const childReach = new Float64Array(oppReach.length);
    for (let card = 0; card < CARD_COUNT; card++) {
      if (board.includes(card)) continue;
      childReach.set(oppReach);
      for (const o of this.hands[opponent].withCard[card]) childReach[o] = 0;
      this.equityValues([...board, card], player, childReach, child);
      for (const h of this.hands[player].withCard[card]) child[h] = 0;
      for (let h = 0; h < out.length; h++) out[h] += child[h];
    }
    scale(out, 1 / chanceFactor(board));
  }

  /** Regret matching over `source` (regrets or strategy sums) into `strategy`, action-major. */
  private strategy(node: ActionNode, source: Float32Array, strategy: Float64Array, sums: Float64Array): void {
    const n = this.hands[node.player].combos.length;
    const actions = node.actions.length;
    const offset = this.offsets[node.id];
    sums.fill(0, 0, n);
    for (let a = 0; a < actions; a++) {
      const base = offset + a * n;
      for (let h = 0; h < n; h++) {
        const value = source[base + h];
        if (value > 0) sums[h] += value;
      }
    }
    for (let h = 0; h < n; h++) sums[h] = sums[h] > 0 ? 1 / sums[h] : 0;
    const uniform = 1 / actions;
    for (let a = 0; a < actions; a++) {
      const base = offset + a * n;
      const row = a * n;
      for (let h = 0; h < n; h++) {
        const scale = sums[h];
        const value = source[base + h];
        strategy[row + h] = scale > 0 ? (value > 0 ? value * scale : 0) : uniform;
      }
    }
  }

  /** Counterfactual values of `player`'s hands at `node` into `out`. */
  private traverse(node: TreeNode, mode: Mode, player: Player, oppReach: Float64Array, ownReach: Float64Array, out: Float64Array, depth: number): void {
    const opponent = other(player);
    switch (node.kind) {
      case "fold": {
        const half = this.spot.pot / 2;
        const payoff = node.folder === player ? -(half + node.invested[player]) : half + node.invested[opponent];
        foldValues(out, this.hands[player], this.hands[opponent], oppReach, this.same[player], payoff);
        return;
      }
      case "showdown": {
        const stake = this.spot.pot / 2 + node.invested[0];
        const { runout } = node;
        showdownValues(out, this.rankings[player][runout], this.rankings[opponent][runout], oppReach, this.same[player], stake, -stake, 0);
        return;
      }
      case "chance":
        this.chance(node, mode, player, oppReach, ownReach, out, depth);
        return;
      default:
        if (node.player === player) this.ownDecision(node, mode, player, oppReach, ownReach, out, depth);
        else this.opponentDecision(node, mode, player, oppReach, ownReach, out, depth);
    }
  }

  private ownDecision(node: ActionNode, mode: Mode, player: Player, oppReach: Float64Array, ownReach: Float64Array, out: Float64Array, depth: number): void {
    const frame = this.frames[depth];
    const n = out.length;
    const actions = node.actions.length;
    const values = frame.values[player];
    const strategy = frame.strategy;
    if (mode !== BEST_RESPONSE) this.strategy(node, mode === TRAIN ? this.regrets[player] : this.strategySum[player], strategy, frame.sums);

    const childReach = mode === TRAIN ? frame.reach[player] : ownReach;
    for (let a = 0; a < actions; a++) {
      if (mode === TRAIN) for (let h = 0; h < n; h++) childReach[h] = ownReach[h] * strategy[a * n + h];
      this.traverse(node.children[a], mode, player, oppReach, childReach, values[a], depth + 1);
    }

    if (mode === BEST_RESPONSE) {
      out.set(values[0]);
      for (let a = 1; a < actions; a++) {
        const value = values[a];
        for (let h = 0; h < n; h++) if (value[h] > out[h]) out[h] = value[h];
      }
      return;
    }

    out.fill(0);
    for (let a = 0; a < actions; a++) {
      const value = values[a];
      const row = a * n;
      for (let h = 0; h < n; h++) out[h] += strategy[row + h] * value[h];
    }
    if (mode !== TRAIN) return;

    const regrets = this.regrets[player];
    const sums = this.strategySum[player];
    const offset = this.offsets[node.id];
    const { alpha, gamma } = this;
    for (let a = 0; a < actions; a++) {
      const value = values[a];
      const base = offset + a * n;
      const row = a * n;
      for (let h = 0; h < n; h++) {
        const regret = regrets[base + h];
        regrets[base + h] = regret * (regret > 0 ? alpha : 0.5) + value[h] - out[h];
        sums[base + h] = sums[base + h] * gamma + ownReach[h] * strategy[row + h];
      }
    }
  }

  private opponentDecision(node: ActionNode, mode: Mode, player: Player, oppReach: Float64Array, ownReach: Float64Array, out: Float64Array, depth: number): void {
    const frame = this.frames[depth];
    const opponent = node.player;
    const m = oppReach.length;
    const strategy = frame.strategy;
    this.strategy(node, mode === TRAIN ? this.regrets[opponent] : this.strategySum[opponent], strategy, frame.sums);
    const childReach = frame.reach[opponent];
    const child = frame.out[player];
    out.fill(0);
    for (let a = 0; a < node.actions.length; a++) {
      const row = a * m;
      let any = false;
      for (let o = 0; o < m; o++) {
        const r = oppReach[o] * strategy[row + o];
        childReach[o] = r;
        if (r !== 0) any = true;
      }
      if (!any) {
        // Zero values below, but the traverser's off-path strategy must keep averaging, or a stale
        // early strategy stays frozen there and invites a deviation.
        if (mode === TRAIN) this.unreached(node.children[a], player, ownReach, depth + 1);
        continue;
      }
      this.traverse(node.children[a], mode, player, childReach, ownReach, child, depth + 1);
      for (let h = 0; h < out.length; h++) out[h] += child[h];
    }
  }

  /** A training pass where the opponent never gets here: every counterfactual value is 0. */
  private unreached(node: TreeNode, player: Player, ownReach: Float64Array, depth: number): void {
    if (node.kind === "fold" || node.kind === "showdown") return;
    const frame = this.frames[depth];
    const childReach = frame.reach[player];
    if (node.kind === "chance") {
      const blocked = this.hands[player].withCard;
      for (let i = 0; i < node.cards.length; i++) {
        childReach.set(ownReach);
        for (const h of blocked[node.cards[i]]) childReach[h] = 0;
        this.unreached(node.children[i], player, childReach, depth + 1);
      }
      return;
    }
    if (node.player !== player) {
      for (const child of node.children) this.unreached(child, player, ownReach, depth + 1);
      return;
    }
    const n = ownReach.length;
    const strategy = frame.strategy;
    this.strategy(node, this.regrets[player], strategy, frame.sums);
    const regrets = this.regrets[player];
    const sums = this.strategySum[player];
    const offset = this.offsets[node.id];
    const { alpha, gamma } = this;
    for (let a = 0; a < node.actions.length; a++) {
      const base = offset + a * n;
      const row = a * n;
      for (let h = 0; h < n; h++) {
        const regret = regrets[base + h];
        regrets[base + h] = regret * (regret > 0 ? alpha : 0.5);
        sums[base + h] = sums[base + h] * gamma + ownReach[h] * strategy[row + h];
        childReach[h] = ownReach[h] * strategy[row + h];
      }
      this.unreached(node.children[a], player, childReach, depth + 1);
    }
  }

  private chance(node: ChanceNode, mode: Mode, player: Player, oppReach: Float64Array, ownReach: Float64Array, out: Float64Array, depth: number): void {
    const frame = this.frames[depth];
    const opponent = other(player);
    const childOpp = frame.reach[opponent];
    const childOwn = frame.reach[player];
    const child = frame.out[player];
    const ownWith = this.hands[player].withCard;
    const oppWith = this.hands[opponent].withCard;
    out.fill(0);
    for (let i = 0; i < node.cards.length; i++) {
      const card = node.cards[i];
      childOpp.set(oppReach);
      for (const o of oppWith[card]) childOpp[o] = 0;
      childOwn.set(ownReach);
      for (const h of ownWith[card]) childOwn[h] = 0;
      this.traverse(node.children[i], mode, player, childOpp, childOwn, child, depth + 1);
      for (const h of ownWith[card]) child[h] = 0;
      for (let h = 0; h < out.length; h++) out[h] += child[h];
    }
    scale(out, 1 / chanceFactor(node.board));
  }
}

function depth(node: TreeNode): number {
  if (node.kind !== "action" && node.kind !== "chance") return 0;
  let deepest = 0;
  for (const child of node.children) deepest = Math.max(deepest, depth(child));
  return deepest + 1;
}

function dot(a: Float64Array, b: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function scale(values: Float64Array, factor: number): void {
  for (let i = 0; i < values.length; i++) values[i] *= factor;
}
