import type { PlayerTypeFile } from "@/lib/charts/player-types";

/**
 * Tight: plays few hands and mostly raises them; rarely limps or calls light.
 * Baseline estimate, the same at every Stack depth.
 */
export const TIGHT: PlayerTypeFile = {
  open: {
    UTG: { raise: "88+, AJs+, KQs, AQo+" },
    "UTG+1": { raise: "77+, AJs+, KQs, AQo+" },
    LJ: { raise: "77+, ATs+, KJs+, AJo+" },
    HJ: { raise: "66+, ATs+, KJs+, QJs, AJo+, KQo" },
    CO: { raise: "55+, A9s+, KTs+, QJs, JTs, ATo+, KQo" },
    BTN: { raise: "44+, A7s+, K9s+, QTs+, JTs, ATo+, KJo+" },
    SB: { raise: "66+, A9s+, KTs+, QJs, ATo+, KQo" },
  },
  "vs-open": {
    early: { raise: "KK+, AKs", call: "QQ-99, AQs, AKo" },
    middle: { raise: "QQ+, AKs", call: "JJ-88, AJs-AQs, KQs, AKo" },
    late: { raise: "QQ+, AKs, AKo", call: "JJ-77, ATs-AQs, KQs, AQo" },
  },
  "vs-limpers": {
    "1": { raise: "TT+, AQs+, AKo", limp: "99-22, ATs-AJs, KQs" },
    "2+": { raise: "JJ+, AKs, AKo", limp: "TT-22, ATs-AQs, KJs+" },
  },
};
