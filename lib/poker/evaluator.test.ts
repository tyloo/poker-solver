import { describe, expect, it } from "vitest";
import { type CardId, cardId, cardRank, cardSuit, parseCards } from "./card";
import { CATEGORY_NAMES, evaluate, evaluateMasks, strengthCategory } from "./evaluator";

const cards = (text: string): CardId[] => (parseCards(text) ?? []).map(cardId);
const strength = (text: string) => evaluate(cards(text));
const category = (text: string) => CATEGORY_NAMES[strengthCategory(strength(text))];

/** Independent, slow 5-card reference: [category, ...tiebreak ranks], compared lexicographically. */
function referenceKey(five: readonly CardId[]): number[] {
  const ranks = five.map(cardRank).sort((a, b) => b - a);
  const flush = five.every((card) => cardSuit(card) === cardSuit(five[0]));
  const distinct = [...new Set(ranks)];
  let straightTop = -1;
  if (distinct.length === 5 && ranks[0] - ranks[4] === 4) straightTop = ranks[0];
  if (distinct.join() === "12,3,2,1,0") straightTop = 3;
  const counts = new Map<number, number>();
  for (const rank of ranks) counts.set(rank, (counts.get(rank) ?? 0) + 1);
  const groups = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const shape = groups.map(([, count]) => count).join("");
  const tiebreak = groups.map(([rank]) => rank);
  if (straightTop >= 0 && flush) return [8, straightTop];
  if (shape === "41") return [7, ...tiebreak];
  if (shape === "32") return [6, ...tiebreak];
  if (flush) return [5, ...tiebreak];
  if (straightTop >= 0) return [4, straightTop];
  if (shape === "311") return [3, ...tiebreak];
  if (shape === "221") return [2, ...tiebreak];
  if (shape === "2111") return [1, ...tiebreak];
  return [0, ...tiebreak];
}

const compareKeys = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? -1) !== (b[i] ?? -1)) return (a[i] ?? -1) - (b[i] ?? -1);
  return 0;
};

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dealDistinct(random: () => number, count: number): CardId[] {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (52 - i));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, count);
}

function subsets<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [...subsets(rest, size - 1).map((subset) => [first, ...subset]), ...subsets(rest, size)];
}

describe("evaluate: every 5-card hand", () => {
  // Reference: Cactus Kev's 7462 equivalence classes (https://suffe.cool/poker/evaluator.html).
  const handsPerCategory = [1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40];
  const classesPerCategory = [1277, 2860, 858, 858, 10, 1277, 156, 156, 10];

  const counts = new Array(9).fill(0);
  const representative = new Map<number, CardId[]>();
  for (let a = 0; a < 52; a++)
    for (let b = a + 1; b < 52; b++)
      for (let c = b + 1; c < 52; c++)
        for (let d = c + 1; d < 52; d++)
          for (let e = d + 1; e < 52; e++) {
            const value = evaluate([a, b, c, d, e]);
            counts[strengthCategory(value)]++;
            if (!representative.has(value)) representative.set(value, [a, b, c, d, e]);
          }
  const classes = [...representative.keys()].sort((x, y) => x - y);

  it("splits the 2,598,960 hands into the reference category counts", () => {
    expect(counts).toEqual(handsPerCategory);
  });

  it("finds exactly 7462 equivalence classes, with the reference count per category", () => {
    expect(classes.length).toBe(7462);
    const perCategory = new Array(9).fill(0);
    for (const value of classes) perCategory[strengthCategory(value)]++;
    expect(perCategory).toEqual(classesPerCategory);
  });

  it("orders the 7462 classes exactly like the reference evaluator", () => {
    const keys = classes.map((value) => referenceKey(representative.get(value) ?? []));
    for (let i = 1; i < keys.length; i++) expect(compareKeys(keys[i - 1], keys[i])).toBeLessThan(0);
  });

  it("matches Cactus Kev ranks at the category boundaries (1 = royal flush, 7462 = 7-high)", () => {
    const kevRank = (text: string) => 7462 - classes.indexOf(strength(text));
    expect(kevRank("AsKsQsJsTs")).toBe(1);
    expect(kevRank("5h4h3h2hAh")).toBe(10);
    expect(kevRank("AsAhAdAcKs")).toBe(11);
    expect(kevRank("2s2h2d2c3s")).toBe(166);
    expect(kevRank("AsAhAdKcKs")).toBe(167);
    expect(kevRank("2s2h2d3c3s")).toBe(322);
    expect(kevRank("AdKdQdJd9d")).toBe(323);
    expect(kevRank("7c5c4c3c2c")).toBe(1599);
    expect(kevRank("AsKhQdJcTs")).toBe(1600);
    expect(kevRank("5s4h3d2cAs")).toBe(1609);
    expect(kevRank("AsAhAdKcQs")).toBe(1610);
    expect(kevRank("AsAhKdKcQs")).toBe(2468);
    expect(kevRank("AsAhKdQcJs")).toBe(3326);
    expect(kevRank("2s2h5d4c3s")).toBe(6185);
    expect(kevRank("AsKhQdJc9s")).toBe(6186);
    expect(kevRank("7s5h4d3c2s")).toBe(7462);
  });
});

describe("evaluate: 6 and 7 cards", () => {
  it("names the made hand", () => {
    expect(category("AsKsQsJsTs9h8h")).toBe("Straight flush");
    expect(category("As2s3s4s5s5h5d")).toBe("Straight flush");
    expect(category("AsAhAdAc2s3h4d")).toBe("Four of a kind");
    expect(category("KsKhKdQcQs2h2d")).toBe("Full house");
    expect(category("KsKhKdQcQsQh2d")).toBe("Full house");
    expect(category("As9s7s5s2sKhKd")).toBe("Flush");
    expect(category("9h8d7c6s5h2c2d")).toBe("Straight");
    expect(category("Ah2d3c4s5hKcKd")).toBe("Straight");
    expect(category("7s7h7d2c3sJhKd")).toBe("Three of a kind");
    expect(category("7s7h5d5c3s3hKd")).toBe("Two pair");
    expect(category("7s7h5d4cTs2hKd")).toBe("Pair");
    expect(category("As9h7d5c3s2hQd")).toBe("High card");
  });

  it("settles known showdowns", () => {
    // Board plays: chop.
    expect(strength("AsKdQhJcTs2h3d")).toBe(strength("AsKdQhJcTs4h5d"));
    // Higher two pair counterfeits the lower one.
    expect(strength("KsKh9d9c5s5hAd")).toBeGreaterThan(strength("KsKh9d9c5s4h3d"));
    // Kicker plays.
    expect(strength("AsAh7d5c2sKhQd")).toBeGreaterThan(strength("AsAh7d5c2sKhJd"));
    // Sixth card cannot play with a straight.
    expect(strength("9h8d7c6s5hAc2d")).toBe(strength("9h8d7c6s5hKc2d"));
    // Higher straight wins, wheel is the lowest.
    expect(strength("6h5d4c3s2h9d9c")).toBeGreaterThan(strength("Ah5d4c3s2h9d9c"));
    // Higher flush card wins.
    expect(strength("Ah9h7h5h2hKsQs")).toBeGreaterThan(strength("Kh9h7h5h2hAsQs"));
    // Full house: trips decide before the pair.
    expect(strength("3s3h3dAcAs")).toBeGreaterThan(strength("2s2h2dAcAh"));
  });

  it("takes the best five of a random sample of 6- and 7-card hands", () => {
    const random = mulberry32(2026);
    for (const size of [6, 7]) {
      for (let sample = 0; sample < 3000; sample++) {
        const hand = dealDistinct(random, size);
        const best = Math.max(...subsets(hand, 5).map(evaluate));
        expect(evaluate(hand)).toBe(best);
      }
    }
  });

  it("evaluates suit masks the same as card lists", () => {
    const random = mulberry32(7);
    for (let sample = 0; sample < 2000; sample++) {
      const hand = dealDistinct(random, 7);
      const masks = [0, 0, 0, 0];
      for (const card of hand) masks[cardSuit(card)] |= 1 << cardRank(card);
      expect(evaluateMasks(masks[0], masks[1], masks[2], masks[3])).toBe(evaluate(hand));
    }
  });

  it("splits all 133,784,560 7-card hands into the reference category counts and 4824 classes", () => {
    // Reference: Wikipedia "Poker probability", 7-card hands.
    const expected = [23294460, 58627800, 31433400, 6461620, 6180020, 4047644, 3473184, 224848, 41584];
    const counts = new Array(9).fill(0);
    const seen = new Set<number>();
    const masks = new Int32Array(4);
    const add = (card: number) => {
      masks[card & 3] ^= 1 << (card >> 2);
    };
    for (let a = 0; a < 52; a++) {
      add(a);
      for (let b = a + 1; b < 52; b++) {
        add(b);
        for (let c = b + 1; c < 52; c++) {
          add(c);
          for (let d = c + 1; d < 52; d++) {
            add(d);
            for (let e = d + 1; e < 52; e++) {
              add(e);
              for (let f = e + 1; f < 52; f++) {
                add(f);
                for (let g = f + 1; g < 52; g++) {
                  add(g);
                  const value = evaluateMasks(masks[0], masks[1], masks[2], masks[3]);
                  counts[value >>> 26]++;
                  seen.add(value);
                  add(g);
                }
                add(f);
              }
              add(e);
            }
            add(d);
          }
          add(c);
        }
        add(b);
      }
      add(a);
    }
    expect(counts).toEqual(expected);
    expect(seen.size).toBe(4824);
  }, 120_000);
});
