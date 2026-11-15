import { CARD_COUNT } from "@/lib/poker/card";
import { COMBO_COUNT, COMBO_HAND_CLASS, COMBO_HI, COMBO_LO, comboId, HAND_CLASS_COUNT } from "@/lib/poker/combo";
import { evaluateMasks } from "@/lib/poker/evaluator";

const N = HAND_CLASS_COUNT;

/**
 * All-in preflop equities between Hand classes, row-major `[i * 169 + j]` in HandClassId order.
 * `equity` is the class average for the row class (ties count half); `weight` is the number of
 * non-conflicting ordered Combo pairs, the exact card-removal weight of the matchup.
 */
export type EquityMatrix = { equity: Float64Array; weight: Float64Array };

/** The suit-isomorphic 5-card boards: five CardIds per board, and how many real boards each stands for. */
export type CanonicalBoards = { cards: Uint8Array; orbits: Uint8Array; count: number };

const FACTORIAL = [1, 1, 2, 6, 24];

/**
 * A board is canonical when its per-suit rank masks are in descending order. Relabelling suits
 * permutes those masks, so each orbit has exactly one canonical member, of size 24 / Π(multiplicity!).
 */
export function canonicalBoards(): CanonicalBoards {
  const cards: number[] = [];
  const orbits: number[] = [];
  const masks = [0, 0, 0, 0];
  const add = (card: number, sign: 1 | -1) => {
    masks[card & 3] += sign * (1 << (card >> 2));
  };
  for (let a = 0; a < CARD_COUNT; a++) {
    add(a, 1);
    for (let b = a + 1; b < CARD_COUNT; b++) {
      add(b, 1);
      for (let c = b + 1; c < CARD_COUNT; c++) {
        add(c, 1);
        for (let d = c + 1; d < CARD_COUNT; d++) {
          add(d, 1);
          for (let e = d + 1; e < CARD_COUNT; e++) {
            add(e, 1);
            if (masks[0] >= masks[1] && masks[1] >= masks[2] && masks[2] >= masks[3]) {
              let stabiliser = 1;
              let run = 1;
              for (let s = 1; s <= 4; s++) {
                if (s < 4 && masks[s] === masks[s - 1]) run++;
                else {
                  stabiliser *= FACTORIAL[run];
                  run = 1;
                }
              }
              cards.push(a, b, c, d, e);
              orbits.push(24 / stabiliser);
            }
            add(e, -1);
          }
          add(d, -1);
        }
        add(c, -1);
      }
      add(b, -1);
    }
    add(a, -1);
  }
  return { cards: Uint8Array.from(cards), count: orbits.length, orbits: Uint8Array.from(orbits) };
}

const sharesCard = (a: number, b: number) => COMBO_HI[a] === COMBO_HI[b] || COMBO_HI[a] === COMBO_LO[b] || COMBO_LO[a] === COMBO_HI[b] || COMBO_LO[a] === COMBO_LO[b];

/** Non-conflicting ordered Combo pairs per pair of Hand classes, e.g. 36 for AA vs KK. */
export function matchupWeights(): Float64Array {
  const weights = new Float64Array(N * N);
  for (let a = 0; a < COMBO_COUNT; a++) {
    for (let b = 0; b < COMBO_COUNT; b++) if (!sharesCard(a, b)) weights[COMBO_HAND_CLASS[a] * N + COMBO_HAND_CLASS[b]]++;
  }
  return weights;
}

/**
 * Running showdown counts: `scores[i * 169 + j]` adds, over boards and non-conflicting Combo pairs,
 * 2 when the class-i Combo wins and 1 when it ties. Counts stay exact integers, so tallies of
 * disjoint board sets can be summed in any order.
 */
export type ShowdownTally = { scores: Float64Array };

type Scratch = {
  live: Uint8Array;
  comboAt: Int16Array;
  liveClass: Uint8Array;
  liveStrength: Int32Array;
  keys: Float64Array;
  below: Float64Array;
  equal: Float64Array;
  row: Float64Array;
};

const scratches = new WeakMap<ShowdownTally, Scratch>();

export function createShowdownTally(): ShowdownTally {
  const tally = { scores: new Float64Array(N * N) };
  scratches.set(tally, {
    below: new Float64Array(N),
    comboAt: new Int16Array(CARD_COUNT * CARD_COUNT),
    equal: new Float64Array(N),
    keys: new Float64Array(COMBO_COUNT),
    live: new Uint8Array(CARD_COUNT),
    liveClass: new Uint8Array(COMBO_COUNT),
    liveStrength: new Int32Array(COMBO_COUNT),
    row: new Float64Array(N),
  });
  return tally;
}

/** Adds one board (five CardIds at `offset`) counted `weight` times. */
export function tallyBoard(tally: ShowdownTally, board: Uint8Array, offset: number, weight: number): void {
  const scratch = scratches.get(tally);
  if (!scratch) throw new Error("Create tallies with createShowdownTally()");
  const { scores } = tally;
  const { live, comboAt, liveClass, liveStrength, keys, below, equal, row } = scratch;

  const masks = [0, 0, 0, 0];
  live.fill(1);
  for (let k = 0; k < 5; k++) {
    const card = board[offset + k];
    live[card] = 0;
    masks[card & 3] |= 1 << (card >> 2);
  }
  const cards: number[] = [];
  for (let card = 0; card < CARD_COUNT; card++) if (live[card]) cards.push(card);

  // Strength of every Combo that avoids the board.
  let count = 0;
  for (let x = 0; x < cards.length; x++) {
    const cx = cards[x];
    for (let y = x + 1; y < cards.length; y++) {
      const cy = cards[y];
      const m = [masks[0], masks[1], masks[2], masks[3]];
      m[cx & 3] |= 1 << (cx >> 2);
      m[cy & 3] |= 1 << (cy >> 2);
      const strength = evaluateMasks(m[0], m[1], m[2], m[3]);
      liveClass[count] = COMBO_HAND_CLASS[comboId(cx, cy)];
      liveStrength[count] = strength;
      comboAt[cx * CARD_COUNT + cy] = count;
      comboAt[cy * CARD_COUNT + cx] = count;
      keys[count] = strength * 2048 + count;
      count++;
    }
  }

  // Walk Combos from weakest to strongest; each scores against every Combo below it (2) or level with it (1).
  const order = keys.subarray(0, count).sort();
  below.fill(0);
  for (let start = 0; start < count; ) {
    const strength = liveStrength[order[start] % 2048];
    let end = start;
    while (end < count && liveStrength[order[end] % 2048] === strength) equal[liveClass[order[end++] % 2048]]++;
    for (let j = 0; j < N; j++) row[j] = weight * (2 * below[j] + equal[j]);
    for (let k = start; k < end; k++) {
      const base = liveClass[order[k] % 2048] * N;
      for (let j = 0; j < N; j++) scores[base + j] += row[j];
    }
    for (let k = start; k < end; k++) {
      const cls = liveClass[order[k] % 2048];
      below[cls] += equal[cls];
      equal[cls] = 0;
    }
    start = end;
  }

  // Take back the pairs that share a card: each Combo with itself, and pairs meeting on one card.
  for (let a = 0; a < count; a++) scores[liveClass[a] * N + liveClass[a]] -= weight;
  const sharing = new Int16Array(cards.length - 1);
  for (const card of cards) {
    let size = 0;
    for (const other of cards) if (other !== card) sharing[size++] = comboAt[card * CARD_COUNT + other];
    for (let p = 0; p < size; p++) {
      const a = sharing[p];
      const base = liveClass[a] * N;
      const sa = liveStrength[a];
      for (let q = 0; q < size; q++) {
        if (q === p) continue;
        const sb = liveStrength[sharing[q]];
        if (sa >= sb) scores[base + liveClass[sharing[q]]] -= sa > sb ? 2 * weight : weight;
      }
    }
  }
}

/** Equities from a tally: each matchup's wins plus half its ties over all its showdowns. */
export function equityMatrix(tally: ShowdownTally): EquityMatrix {
  const equity = new Float64Array(N * N);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const total = tally.scores[i * N + j] + tally.scores[j * N + i];
      equity[i * N + j] = total > 0 ? tally.scores[i * N + j] / total : 0.5;
    }
  }
  return { equity, weight: matchupWeights() };
}
