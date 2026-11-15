import type { PlayerTypeFile } from "@/lib/charts/player-types";

const WIDE_LIMP = "99-22, AJs-A2s, KJs-K8s, QJs-Q9s, JTs-J9s, T9s, 98s, 87s, 76s, 65s, AQo-A9o, KQo-KTo, QJo-QTo, JTo";
const WIDEST_LIMP = "99-22, AJs-A2s, K2s+, Q2s+, J4s+, T6s+, 96s+, 85s+, 75s+, 64s+, 53s+, 43s, AQo-A2o, KQo-K5o, QJo-Q7o, JTo-J8o, T9o-T8o, 98o, 87o, 76o";
const WIDER_LIMP = "99-22, AJs-A2s, KQs-K2s, QJs-Q5s, JTs-J7s, T9s-T7s, 98s-96s, 87s-85s, 76s-75s, 65s-64s, 54s, AQo-A2o, KQo-K8o, QJo-Q9o, JTo-J9o, T9o, 98o, 87o";

/**
 * Loose: the passive, wide bar player. Raises only strong hands, limps and calls a lot,
 * from any Position. Baseline estimate, the same at every Stack depth.
 */
export const LOOSE: PlayerTypeFile = {
  open: {
    UTG: { raise: "TT+, AQs+, AKo", limp: WIDE_LIMP },
    "UTG+1": { raise: "TT+, AQs+, AKo", limp: WIDE_LIMP },
    LJ: { raise: "TT+, AQs+, AKo", limp: WIDE_LIMP },
    HJ: { raise: "TT+, AQs+, AKo", limp: WIDE_LIMP },
    CO: { raise: "TT+, AQs+, AKo", limp: WIDER_LIMP },
    BTN: { raise: "TT+, AQs+, AKo", limp: WIDEST_LIMP },
    SB: { raise: "TT+, AQs+, AKo", limp: WIDEST_LIMP },
  },
  "vs-open": {
    early: { raise: "QQ+, AKs", call: "JJ-22, AQs-A2s, KQs-K8s, QJs-Q9s, JTs-J8s, T9s-T8s, 98s-97s, 87s, 76s, 65s, 54s, AKo-ATo, KQo-KTo, QJo-QTo, JTo" },
    middle: { raise: "QQ+, AKs", call: "JJ-22, AQs-A2s, KQs-K7s, QJs-Q8s, JTs-J8s, T9s-T7s, 98s-97s, 87s-86s, 76s, 65s, 54s, AKo-A9o, KQo-KTo, QJo-QTo, JTo" },
    late: {
      raise: "QQ+, AKs",
      call: "JJ-22, AQs-A2s, KQs-K2s, QJs-Q5s, JTs-J7s, T9s-T7s, 98s-96s, 87s-85s, 76s-75s, 65s-64s, 54s, AKo-A2o, KQo-K8o, QJo-Q9o, JTo-J9o, T9o, 98o",
    },
  },
  "vs-limpers": {
    "1": { raise: "QQ+, AKs, AKo", limp: "JJ-22, AQs-A2s, K2s+, Q5s+, J7s+, T7s+, 97s+, 86s+, 75s+, 64s+, 54s, AQo-A2o, KQo-K8o, QJo-Q9o, JTo-J9o, T9o, 98o" },
    "2+": { raise: "QQ+, AKs, AKo", limp: "JJ-22, AQs-A2s, K2s+, Q5s+, J7s+, T7s+, 97s+, 86s+, 75s+, 64s+, 54s, AQo-A2o, KQo-K8o, QJo-Q9o, JTo-J9o, T9o, 98o" },
  },
};
