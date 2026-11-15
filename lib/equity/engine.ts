import { CARD_COUNT, type CardId, cardFromId } from "@/lib/poker/card";
import { COMBO_COUNT, COMBO_HI, COMBO_LO, comboId } from "@/lib/poker/combo";
import { evaluateMasks } from "@/lib/poker/evaluator";
import type { Range } from "@/lib/poker/range";

export type EquityPlayer = { kind: "hand"; cards: readonly CardId[] } | { kind: "range"; range: Range } | { kind: "random" };

export type EquityInput = { players: readonly EquityPlayer[]; board: readonly CardId[]; dead: readonly CardId[] };

/** Shares of all showdowns, each in [0, 1]. `equity` counts a split pot as 1/k of a win. */
export type PlayerEquity = { win: number; tie: number; equity: number };

export type EquityMethod = "exact" | "monte-carlo";

export type EquityResult = {
  method: EquityMethod;
  /** Showdowns counted so far: boards times deals when exact, random deals otherwise. */
  samples: number;
  /** 0 to 1; reaches 1 when the job is done. */
  progress: number;
  players: PlayerEquity[];
};

export type EquityOptions = {
  /** Largest enumeration, in hand evaluations, solved exactly; bigger ones use Monte Carlo. */
  exactLimit?: number;
  maxSamples?: number;
  minSamples?: number;
  /** Monte Carlo stops once every player's equity has at most this standard error. */
  targetError?: number;
  random?: () => number;
};

export type EquityJob = {
  readonly method: EquityMethod;
  /** Runs up to `showdowns` more showdowns; returns true when the job is done. */
  step: (showdowns: number) => boolean;
  result: () => EquityResult;
  /** Set when sampling had to give up. */
  readonly error: string | null;
};

export type EquityJobOutcome = { ok: true; job: EquityJob } | { ok: false; error: string };

export const MAX_PLAYERS = 8;

const DEFAULTS = { exactLimit: 20_000_000, maxSamples: 2_000_000, minSamples: 10_000, targetError: 0.0005 };
const DFS_NODE_LIMIT = 200_000;
const MAX_REJECTIONS = 1_000_000;
const CHECK_EVERY = 1024;

/** Deterministic generator in [0, 1) for tests (mulberry32). */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUIT_SYMBOLS = { c: "♣", d: "♦", h: "♥", s: "♠" } as const;

function cardLabel(card: CardId): string {
  const { rank, suit } = cardFromId(card);
  return (rank === "T" ? "10" : rank) + SUIT_SYMBOLS[suit];
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 0; i < k; i++) result = (result * (n - i)) / (i + 1);
  return Math.round(result);
}

type Prepared = {
  players: readonly EquityPlayer[];
  /** Combos and weights each player can hold, given the cards in use. */
  combos: Uint16Array[];
  weights: Float64Array[];
  blocked: Uint8Array;
  board: readonly CardId[];
  /** Cards left after the known cards and every player's hole cards. */
  remaining: number;
};

function prepare(input: EquityInput): Prepared | string {
  const { players, board, dead } = input;
  if (players.length < 2) return "Add at least 2 players.";
  if (players.length > MAX_PLAYERS) return `At most ${MAX_PLAYERS} players.`;
  if (board.length > 5) return "The board has at most 5 cards.";
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (player.kind === "hand" && player.cards.length !== 2) return `Player ${i + 1} needs two cards.`;
  }

  const blocked = new Uint8Array(CARD_COUNT);
  const known = [...players.flatMap((player) => (player.kind === "hand" ? player.cards : [])), ...board, ...dead];
  for (const card of known) {
    if (!Number.isInteger(card) || card < 0 || card >= CARD_COUNT) return "Unknown card.";
    if (blocked[card]) return `${cardLabel(card)} is used twice.`;
    blocked[card] = 1;
  }

  const combos: Uint16Array[] = [];
  const weights: Float64Array[] = [];
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (player.kind === "hand") {
      combos.push(Uint16Array.of(comboId(player.cards[0], player.cards[1])));
      weights.push(Float64Array.of(1));
      continue;
    }
    const list: number[] = [];
    const listWeights: number[] = [];
    let named = false;
    for (let combo = 0; combo < COMBO_COUNT; combo++) {
      const weight = player.kind === "random" ? 1 : player.range[combo];
      if (!(weight > 0)) continue;
      named = true;
      if (blocked[COMBO_HI[combo]] || blocked[COMBO_LO[combo]]) continue;
      list.push(combo);
      listWeights.push(Math.min(weight, 1));
    }
    if (!named) return `Player ${i + 1}'s range is empty.`;
    if (list.length === 0) return `Player ${i + 1}'s range has no hand left after the cards in use.`;
    combos.push(Uint16Array.from(list));
    weights.push(Float64Array.from(listWeights));
  }

  const dealt = players.filter((player) => player.kind !== "hand").length * 2;
  const remaining = CARD_COUNT - known.length - dealt;
  if (remaining < 5 - board.length) return "Not enough cards left to deal the board.";

  const ranged = players.flatMap((player, i) => (player.kind === "range" ? [i] : []));
  if (!canDeal(ranged, combos)) return "These ranges cannot be dealt together: they need the same cards.";

  return { blocked, board, combos, players, remaining, weights };
}

/** Whether the given players can hold disjoint Combos at once (assumed true past the search limit). */
function canDeal(players: number[], combos: Uint16Array[]): boolean {
  const used = new Uint8Array(CARD_COUNT);
  let nodes = 0;
  const search = (index: number): boolean => {
    if (index === players.length || ++nodes > DFS_NODE_LIMIT) return true;
    for (const combo of combos[players[index]]) {
      const hi = COMBO_HI[combo];
      const lo = COMBO_LO[combo];
      if (used[hi] || used[lo]) continue;
      used[hi] = used[lo] = 1;
      const found = search(index + 1);
      used[hi] = used[lo] = 0;
      if (found) return true;
    }
    return false;
  };
  return search(0);
}

/** Win, tie and pot-share totals, plus squared shares for the Monte Carlo error estimate. */
class Tally {
  readonly win: Float64Array;
  readonly tie: Float64Array;
  readonly share: Float64Array;
  readonly shareSquares: Float64Array;
  readonly strengths: Int32Array;
  /** Per-suit rank masks of each player's hole cards: `masks[player * 4 + suit]`. */
  readonly masks: Int32Array;
  total = 0;

  constructor(readonly count: number) {
    this.win = new Float64Array(count);
    this.tie = new Float64Array(count);
    this.share = new Float64Array(count);
    this.shareSquares = new Float64Array(count);
    this.strengths = new Int32Array(count);
    this.masks = new Int32Array(count * 4);
  }

  setHole(player: number, a: CardId, b: CardId) {
    const base = player * 4;
    this.masks[base] = this.masks[base + 1] = this.masks[base + 2] = this.masks[base + 3] = 0;
    this.masks[base + (a & 3)] |= 1 << (a >> 2);
    this.masks[base + (b & 3)] |= 1 << (b >> 2);
  }

  showdown(s0: number, s1: number, s2: number, s3: number, weight: number) {
    const { masks, strengths } = this;
    let best = -1;
    let winners = 0;
    let winner = 0;
    for (let player = 0, base = 0; player < this.count; player++, base += 4) {
      const strength = evaluateMasks(s0 | masks[base], s1 | masks[base + 1], s2 | masks[base + 2], s3 | masks[base + 3]);
      strengths[player] = strength;
      if (strength > best) {
        best = strength;
        winners = 1;
        winner = player;
      } else if (strength === best) winners++;
    }
    this.total += weight;
    if (winners === 1) {
      this.win[winner] += weight;
      this.share[winner] += weight;
      this.shareSquares[winner] += weight;
      return;
    }
    const part = 1 / winners;
    for (let player = 0; player < this.count; player++) {
      if (strengths[player] !== best) continue;
      this.tie[player] += weight;
      this.share[player] += weight * part;
      this.shareSquares[player] += weight * part * part;
    }
  }

  players(): PlayerEquity[] {
    const total = this.total || 1;
    return Array.from({ length: this.count }, (_, player) => ({
      equity: this.share[player] / total,
      tie: this.tie[player] / total,
      win: this.win[player] / total,
    }));
  }

  /** Largest standard error of a player's equity, treating each showdown as one sample. */
  maxError(): number {
    let max = 0;
    for (let player = 0; player < this.count; player++) {
      const mean = this.share[player] / this.total;
      const variance = Math.max(0, this.shareSquares[player] / this.total - mean * mean);
      max = Math.max(max, Math.sqrt(variance / this.total));
    }
    return max;
  }
}

function boardMasks(board: readonly CardId[]): Int32Array {
  const masks = new Int32Array(4);
  for (const card of board) masks[card & 3] |= 1 << (card >> 2);
  return masks;
}

/** Every deal of the players' Combos times every board, weighted by the product of Combo weights. */
function exactJob(prepared: Prepared): EquityJob {
  const { combos, weights, blocked, board } = prepared;
  const count = combos.length;
  const missing = 5 - board.length;
  const tally = new Tally(count);
  const base = boardMasks(board);
  const deals = combos.reduce((product, list) => product * list.length, 1);
  const boardsPerDeal = choose(prepared.remaining, missing);

  const odometer = new Int32Array(count);
  const used = new Int32Array(CARD_COUNT);
  let stamp = 0;
  let dealIndex = -1;
  let dealWeight = 0;
  let boardActive = false;
  let boardsDone = 0;
  let samples = 0;
  let done = false;
  const deck = new Int32Array(prepared.remaining);
  const pick = new Int32Array(missing);

  const advanceOdometer = (): boolean => {
    if (dealIndex < 0) {
      dealIndex = 0;
      return true;
    }
    for (let player = count - 1; player >= 0; player--) {
      if (++odometer[player] < combos[player].length) {
        dealIndex++;
        return true;
      }
      odometer[player] = 0;
    }
    return false;
  };

  /** Moves to the next deal whose Combos share no card and sets up its deck. */
  const nextDeal = (): boolean => {
    while (advanceOdometer()) {
      stamp++;
      let valid = true;
      dealWeight = 1;
      for (let player = 0; player < count && valid; player++) {
        const combo = combos[player][odometer[player]];
        const hi = COMBO_HI[combo];
        const lo = COMBO_LO[combo];
        if (used[hi] === stamp || used[lo] === stamp) valid = false;
        used[hi] = used[lo] = stamp;
        dealWeight *= weights[player][odometer[player]];
        tally.setHole(player, hi, lo);
      }
      if (!valid) continue;
      let size = 0;
      for (let card = 0; card < CARD_COUNT; card++) if (!blocked[card] && used[card] !== stamp) deck[size++] = card;
      for (let i = 0; i < missing; i++) pick[i] = i;
      boardsDone = 0;
      return true;
    }
    return false;
  };

  const nextBoard = (): boolean => {
    let i = missing - 1;
    while (i >= 0 && pick[i] === deck.length - missing + i) i--;
    if (i < 0) return false;
    pick[i]++;
    for (let j = i + 1; j < missing; j++) pick[j] = pick[j - 1] + 1;
    return true;
  };

  return {
    error: null,
    method: "exact",
    result: () => ({
      method: "exact",
      players: tally.players(),
      progress: done ? 1 : (Math.max(dealIndex, 0) + boardsDone / boardsPerDeal) / deals,
      samples,
    }),
    step: (showdowns) => {
      let budget = showdowns;
      while (!done && budget > 0) {
        if (!boardActive) {
          if (!nextDeal()) {
            done = true;
            break;
          }
          boardActive = true;
        }
        while (budget > 0) {
          let s0 = base[0];
          let s1 = base[1];
          let s2 = base[2];
          let s3 = base[3];
          for (let i = 0; i < missing; i++) {
            const card = deck[pick[i]];
            const bit = 1 << (card >> 2);
            const suit = card & 3;
            if (suit === 0) s0 |= bit;
            else if (suit === 1) s1 |= bit;
            else if (suit === 2) s2 |= bit;
            else s3 |= bit;
          }
          tally.showdown(s0, s1, s2, s3, dealWeight);
          samples++;
          boardsDone++;
          budget--;
          if (!nextBoard()) {
            boardActive = false;
            break;
          }
        }
      }
      return done;
    },
  };
}

/**
 * Random deals: Range players are drawn by weight and rejected together on a card clash (so deals stay
 * proportional to the product of weights), then random players and the board come off the remaining deck.
 */
function monteCarloJob(prepared: Prepared, options: Required<Omit<EquityOptions, "exactLimit">>): EquityJob {
  const { combos, weights, blocked, board, players } = prepared;
  const { maxSamples, minSamples, targetError, random } = options;
  const count = players.length;
  const missing = 5 - board.length;
  const tally = new Tally(count);
  const base = boardMasks(board);

  const ranged = players.flatMap((player, i) => (player.kind === "range" ? [i] : []));
  const randoms = players.flatMap((player, i) => (player.kind === "random" ? [i] : []));
  players.forEach((player, i) => {
    if (player.kind === "hand") tally.setHole(i, player.cards[0], player.cards[1]);
  });
  const cumulative = ranged.map((player) => {
    const sums = new Float64Array(weights[player].length);
    let sum = 0;
    weights[player].forEach((weight, i) => {
      sum += weight;
      sums[i] = sum;
    });
    return sums;
  });
  const deck = Int32Array.from({ length: CARD_COUNT }, (_, card) => card).filter((card) => !blocked[card]);
  const used = new Int32Array(CARD_COUNT);
  let stamp = 0;
  let samples = 0;
  let done = false;
  let error: string | null = null;
  let rejections = 0;

  const drawCombo = (index: number): number => {
    const sums = cumulative[index];
    const target = random() * sums[sums.length - 1];
    let low = 0;
    let high = sums.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (sums[mid] > target) high = mid;
      else low = mid + 1;
    }
    return combos[ranged[index]][low];
  };

  const drawCard = (): CardId => {
    for (;;) {
      const card = deck[Math.floor(random() * deck.length)];
      if (used[card] !== stamp) {
        used[card] = stamp;
        return card;
      }
    }
  };

  const sample = (): boolean => {
    stamp++;
    for (let i = 0; i < ranged.length; i++) {
      const combo = drawCombo(i);
      const hi = COMBO_HI[combo];
      const lo = COMBO_LO[combo];
      if (used[hi] === stamp || used[lo] === stamp) return false;
      used[hi] = used[lo] = stamp;
      tally.setHole(ranged[i], hi, lo);
    }
    for (const player of randoms) tally.setHole(player, drawCard(), drawCard());
    let s0 = base[0];
    let s1 = base[1];
    let s2 = base[2];
    let s3 = base[3];
    for (let i = 0; i < missing; i++) {
      const card = drawCard();
      const bit = 1 << (card >> 2);
      const suit = card & 3;
      if (suit === 0) s0 |= bit;
      else if (suit === 1) s1 |= bit;
      else if (suit === 2) s2 |= bit;
      else s3 |= bit;
    }
    tally.showdown(s0, s1, s2, s3, 1);
    return true;
  };

  return {
    get error() {
      return error;
    },
    method: "monte-carlo",
    result: () => ({ method: "monte-carlo", players: tally.players(), progress: done ? 1 : samples / maxSamples, samples }),
    step: (showdowns) => {
      let budget = showdowns;
      while (!done && budget > 0) {
        if (!sample()) {
          if (++rejections > MAX_REJECTIONS) {
            error = "These ranges overlap too much to sample.";
            done = true;
          }
          continue;
        }
        rejections = 0;
        samples++;
        budget--;
        if (samples >= maxSamples) done = true;
        else if (samples % CHECK_EVERY === 0 && samples >= minSamples && tally.maxError() <= targetError) done = true;
      }
      return done;
    },
  };
}

export function createEquityJob(input: EquityInput, options: EquityOptions = {}): EquityJobOutcome {
  const prepared = prepare(input);
  if (typeof prepared === "string") return { error: prepared, ok: false };
  const { exactLimit, maxSamples, minSamples, targetError } = { ...DEFAULTS, ...options };
  const deals = prepared.combos.reduce((product, list) => product * list.length, 1);
  const evaluations = deals * choose(prepared.remaining, 5 - prepared.board.length) * prepared.players.length;
  if (evaluations <= exactLimit) return { job: exactJob(prepared), ok: true };
  return { job: monteCarloJob(prepared, { maxSamples, minSamples, random: options.random ?? Math.random, targetError }), ok: true };
}

/** Runs a job to the end in one go (tests and small inputs). */
export function computeEquity(input: EquityInput, options: EquityOptions = {}): { ok: true; result: EquityResult } | { ok: false; error: string } {
  const outcome = createEquityJob(input, options);
  if (!outcome.ok) return outcome;
  while (!outcome.job.step(1_000_000));
  if (outcome.job.error) return { error: outcome.job.error, ok: false };
  return { ok: true, result: outcome.job.result() };
}
