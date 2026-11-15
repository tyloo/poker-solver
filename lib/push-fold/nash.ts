import { HAND_CLASS_COUNT, handClassCombos } from "@/lib/poker/combo";
import { POSITIONS, type Position } from "@/lib/poker/table";
import type { EquityMatrix } from "./equity-matrix";

const N = HAND_CLASS_COUNT;

/** Chips each Position posts before the deal, in bb. */
const BLIND: Partial<Record<Position, number>> = { BB: 1, SB: 0.5 };
const blindOf = (position: Position) => BLIND[position] ?? 0;
const DEAD_BLINDS = 1.5;

/**
 * A chip-EV push/fold game, folded to `pusher`: every player has `stack` bb (blinds included),
 * and the `callers` behind act in order. Single-caller model: after the first call, everyone else folds.
 */
export type PushFoldGame = { stack: number; pusher: Position; callers: readonly Position[] };

export function foldedTo(pusher: Position, stack: number): PushFoldGame {
  if (pusher === "BB") throw new Error("The BB is never folded to");
  return { callers: POSITIONS.slice(POSITIONS.indexOf(pusher) + 1), pusher, stack };
}

/** Pot once `caller` calls: both stacks plus the blinds of players who folded. */
function potWith(game: PushFoldGame, caller: Position): number {
  return 2 * game.stack + DEAD_BLINDS - blindOf(game.pusher) - blindOf(caller);
}

/** The matrix pre-multiplied for the hot loops: `weight`, `weight × equity` and its transpose. */
type Products = { weight: Float64Array; weighted: Float64Array; weightedT: Float64Array; total: Float64Array };

const productsCache = new WeakMap<EquityMatrix, Products>();

function products(matrix: EquityMatrix): Products {
  const cached = productsCache.get(matrix);
  if (cached) return cached;
  const weighted = new Float64Array(N * N);
  const weightedT = new Float64Array(N * N);
  const total = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const value = matrix.weight[i * N + j] * matrix.equity[i * N + j];
      weighted[i * N + j] = value;
      weightedT[j * N + i] = value;
      total[i] += matrix.weight[i * N + j];
    }
  }
  const result = { total, weight: matrix.weight, weighted, weightedT };
  productsCache.set(matrix, result);
  return result;
}

/** `out = M · v` for a 169×169 row-major matrix. */
function multiply(m: Float64Array, v: Float64Array, out = new Float64Array(N)): Float64Array {
  for (let i = 0; i < N; i++) {
    let sum = 0;
    for (let j = 0; j < N; j++) sum += m[i * N + j] * v[j];
    out[i] = sum;
  }
  return out;
}

/**
 * Pusher gain per Hand class, EV(push) − EV(fold) in bb, given each caller's call frequencies.
 * `callWeight[q]` and `callEquity[q]` are `weight · c_q` and `(weight × equity) · c_q`.
 */
function pushGainsFrom(game: PushFoldGame, { total }: Products, callWeight: readonly Float64Array[], callEquity: readonly Float64Array[], out = new Float64Array(N)) {
  const win = DEAD_BLINDS - blindOf(game.pusher);
  for (let i = 0; i < N; i++) {
    let reach = 1;
    let ev = 0;
    for (let q = 0; q < game.callers.length; q++) {
      const calls = callWeight[q][i] / total[i];
      ev += reach * ((callEquity[q][i] / total[i]) * potWith(game, game.callers[q]) - calls * game.stack);
      reach *= 1 - calls;
    }
    out[i] = ev + reach * win + blindOf(game.pusher);
  }
  return out;
}

/** Caller gain per Hand class facing the push, EV(call) − EV(fold) in bb, from `weight · p` and `(weight × equity) · p`. */
function callGainsFrom(game: PushFoldGame, caller: number, pushWeight: Float64Array, pushEquity: Float64Array, out = new Float64Array(N)) {
  const position = game.callers[caller];
  const pot = potWith(game, position);
  const risk = game.stack - blindOf(position);
  for (let j = 0; j < N; j++) out[j] = pushWeight[j] > 0 ? (pushEquity[j] * pot) / pushWeight[j] - risk : 0;
  return out;
}

/** EV(push) − EV(fold) in bb for each pusher Hand class, given each caller's call frequencies (in `game.callers` order). */
export function pushGains(matrix: EquityMatrix, game: PushFoldGame, calls: readonly Float64Array[]): Float64Array {
  const m = products(matrix);
  return pushGainsFrom(
    game,
    m,
    calls.map((c) => multiply(m.weight, c)),
    calls.map((c) => multiply(m.weighted, c)),
  );
}

/** EV(call) − EV(fold) in bb for each Hand class of `game.callers[caller]`, facing a push with frequencies `push`. */
export function callGains(matrix: EquityMatrix, game: PushFoldGame, caller: number, push: Float64Array): Float64Array {
  const m = products(matrix);
  return callGainsFrom(game, caller, multiply(m.weight, push), multiply(m.weighted, push));
}

export type PushFoldSolution = {
  /** Push frequency per Hand class. */
  push: Float64Array;
  /** Call frequency per Hand class for each caller, in `game.callers` order. */
  calls: Float64Array[];
  /** How much each side could still gain by deviating, in bb per dealt hand. */
  gaps: { pusher: number; callers: number[] };
};

const COMBOS = Float64Array.from({ length: N }, (_, cls) => handClassCombos(cls).length);

function gap(strategy: Float64Array, gains: Float64Array): number {
  let sum = 0;
  for (let cls = 0; cls < N; cls++) sum += COMBOS[cls] * (Math.max(gains[cls], 0) - strategy[cls] * gains[cls]);
  return sum / 1326;
}

/**
 * One average strategy of fictitious play, with `weight · x` and `(weight × equity) · x` kept in step.
 * The best response is pure, so its products change only where a Hand class flips.
 */
class AverageStrategy {
  readonly average = new Float64Array(N).fill(1);
  readonly averageWeight: Float64Array;
  readonly averageEquity: Float64Array;
  private readonly best = new Uint8Array(N).fill(1);
  private readonly bestWeight: Float64Array;
  private readonly bestEquity: Float64Array;
  private readonly m: Products;

  constructor(m: Products) {
    this.m = m;
    const ones = new Float64Array(N).fill(1);
    this.averageWeight = multiply(m.weight, ones);
    this.averageEquity = multiply(m.weighted, ones);
    this.bestWeight = this.averageWeight.slice();
    this.bestEquity = this.averageEquity.slice();
  }

  /** Plays the best response to `gains` (fold when indifferent) and folds it into the average at step `t`. */
  update(gains: Float64Array, t: number): void {
    const { weight, weightedT } = this.m;
    for (let cls = 0; cls < N; cls++) {
      const play = gains[cls] > 0 ? 1 : 0;
      if (play === this.best[cls]) continue;
      this.best[cls] = play;
      const sign = play ? 1 : -1;
      // weight is symmetric, so its row is its column.
      for (let i = 0; i < N; i++) {
        this.bestWeight[i] += sign * weight[cls * N + i];
        this.bestEquity[i] += sign * weightedT[cls * N + i];
      }
    }
    // Linear averaging: step t weighs t + 1, which converges far faster than plain 1 / (t + 1).
    const step = 2 / (t + 2);
    for (let i = 0; i < N; i++) {
      this.average[i] += (this.best[i] - this.average[i]) * step;
      this.averageWeight[i] += (this.bestWeight[i] - this.averageWeight[i]) * step;
      this.averageEquity[i] += (this.bestEquity[i] - this.averageEquity[i]) * step;
    }
  }
}

/**
 * Chip-EV Nash equilibrium of a push/fold game by alternating fictitious play: each step the callers
 * best-respond to the pusher's average strategy, then the pusher to theirs, and the averages weigh
 * later steps more. Deterministic: a fixed number of `iterations`, a fixed order, and ties of exactly
 * zero gain fold.
 */
export function solvePushFold(matrix: EquityMatrix, game: PushFoldGame, iterations: number): PushFoldSolution {
  const m = products(matrix);
  const pusher = new AverageStrategy(m);
  const callers = game.callers.map(() => new AverageStrategy(m));
  const gains = new Float64Array(N);
  for (let t = 1; t <= iterations; t++) {
    callers.forEach((caller, q) => {
      caller.update(callGainsFrom(game, q, pusher.averageWeight, pusher.averageEquity, gains), t);
    });
    pusher.update(
      pushGainsFrom(
        game,
        m,
        callers.map((caller) => caller.averageWeight),
        callers.map((caller) => caller.averageEquity),
        gains,
      ),
      t,
    );
  }

  const push = pusher.average.slice();
  const calls = callers.map((caller) => caller.average.slice());
  return {
    calls,
    gaps: {
      callers: calls.map((c, q) => gap(c, callGains(matrix, game, q, push))),
      pusher: gap(push, pushGains(matrix, game, calls)),
    },
    push,
  };
}
