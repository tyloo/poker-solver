import type { VsOpenChartFile } from "@/lib/charts/chart-files";

/**
 * Vs open: one player has raised before you. 3-bet (`raise`) or call; fold is the remainder.
 * The opener is grouped as early (UTG, UTG+1), middle (LJ, HJ) or late (CO, BTN, SB).
 * At 25bb and below most 3-bets are all-in.
 *
 * Baseline starting points: common 8-max tournament defending ranges without antes, not yet
 * tuned to the league. Set `baseline: false` once you have adjusted them from session results.
 */
export const VS_OPEN_CHARTS: VsOpenChartFile = {
  baseline: true,
  tiers: {
    "40bb+": {
      early: {
        "UTG+1": { raise: "QQ+, AKs, AKo", call: "JJ-77, AQs-ATs, KQs-KJs, QJs, JTs, AQo" },
        LJ: { raise: "QQ+, AKs, AKo", call: "JJ-77, AQs-ATs, KQs-KJs, QJs, JTs, AQo" },
        HJ: { raise: "QQ+, AKs, AKo, A5s:0.5", call: "JJ-66, AQs-ATs, KQs-KJs, QJs, JTs, T9s, AQo" },
        CO: { raise: "QQ+, AKs, AKo, A5s:0.5", call: "JJ-55, AQs-ATs, KQs-KTs, QJs-QTs, JTs, T9s, AQo" },
        BTN: { raise: "QQ+, AKs, AKo, A5s-A4s:0.5", call: "JJ-22, AQs-ATs, KQs-KTs, QJs-QTs, JTs, T9s, 98s, AQo, AJo:0.5, KQo:0.5" },
        SB: { raise: "QQ+, AKs, AKo, AQs, A5s:0.5", call: "JJ-88, AJs-ATs, KQs, KJs, QJs, JTs" },
        BB: { raise: "QQ+, AKs, AKo", call: "JJ-22, AQs-A2s, KQs-K9s, QJs-Q9s, JTs-J9s, T9s-T8s, 98s-97s, 87s, 76s, 65s, AQo-ATo, KQo-KJo, QJo" },
      },
      middle: {
        HJ: { raise: "QQ+, AKs, AKo, AQs, A5s:0.5", call: "JJ-66, AJs-ATs, KQs-KJs, QJs, JTs, T9s, AQo" },
        CO: { raise: "JJ+, AKs, AKo, AQs, A5s-A4s:0.5", call: "TT-55, AJs-ATs, KQs-KTs, QJs-QTs, JTs, T9s, 98s, AQo, AJo:0.5, KQo" },
        BTN: { raise: "JJ+, AKs, AKo, AQs, A5s-A4s, KQs:0.5", call: "TT-22, AJs-A9s, KQs:0.5, KJs-KTs, QJs-QTs, JTs-J9s, T9s, 98s, 87s, 76s, AQo, AJo, KQo" },
        SB: { raise: "JJ+, AKs, AKo, AQs, AJs:0.5, KQs:0.5, A5s-A4s:0.5", call: "TT-77, AJs:0.5, ATs, KQs:0.5, KJs, QJs, JTs" },
        BB: {
          raise: "JJ+, AKs, AKo, AQs, A5s:0.5",
          call: "TT-22, AJs-A6s, A5s:0.5, A4s-A2s, KQs-K7s, QJs-Q8s, JTs-J8s, T9s-T7s, 98s-96s, 87s-86s, 76s-75s, 65s-64s, 54s, AQo-A9o, KQo-KTo, QJo-QTo, JTo",
        },
      },
      late: {
        BTN: {
          raise: "TT+, AQs+, AQo+, AJs:0.5, KQs:0.5, A5s-A3s",
          call: "99-22, AJs:0.5, ATs-A6s, KQs:0.5, KJs-K9s, QJs-Q9s, JTs-J9s, T9s-T8s, 98s, 87s, 76s, 65s, AJo-ATo, KQo-KJo, QJo",
        },
        SB: { raise: "99+, ATs+, KJs+, A5s-A4s, AJo+, KQo, QJs:0.5", call: "88-44, A9s-A6s, KTs-K9s, QJs:0.5, QTs, JTs, T9s, 98s, ATo" },
        BB: {
          raise: "TT+, AJs+, KQs, A5s-A4s, AQo+",
          call: "99-22, ATs-A6s, A3s-A2s, KJs-K2s, QJs-Q5s, JTs-J7s, T9s-T7s, 98s-96s, 87s-85s, 76s-74s, 65s-63s, 54s-53s, 43s, AJo-A2o, KQo-K8o, QJo-Q9o, JTo-J9o, T9o-T8o, 98o, 87o",
        },
      },
    },
    "25bb": {
      early: {
        "UTG+1": { raise: "JJ+, AKs, AKo, AQs", call: "TT-66, AJs-ATs, KQs-KJs, QJs, JTs, AQo" },
        LJ: { raise: "JJ+, AKs, AKo, AQs", call: "TT-66, AJs-ATs, KQs-KJs, QJs, JTs, AQo" },
        HJ: { raise: "JJ+, AKs, AKo, AQs", call: "TT-55, AJs-ATs, KQs-KJs, QJs, JTs, AQo" },
        CO: { raise: "TT+, AKs, AKo, AQs", call: "99-22, AJs-ATs, KQs-KTs, QJs-QTs, JTs, T9s, AQo, AJo:0.5, KQo:0.5" },
        BTN: { raise: "TT+, AKs, AKo, AQs", call: "99-22, AJs-ATs, KQs-KTs, QJs-QTs, JTs, T9s, AQo, AJo:0.5, KQo:0.5" },
        SB: { raise: "TT+, AKs, AKo, AQs, AJs", call: "99-66, ATs, KQs" },
        BB: { raise: "JJ+, AKs, AKo, AQs", call: "TT-22, AJs-A2s, KQs-K9s, QJs-Q9s, JTs-J9s, T9s-T8s, 98s, 87s, 76s, 65s, AQo-ATo, KQo-KJo, QJo" },
      },
      middle: {
        HJ: { raise: "JJ+, AKs, AKo, AQs", call: "TT-55, AJs-ATs, KQs-KJs, QJs, JTs, AQo" },
        CO: { raise: "TT+, AKs, AKo, AQs, AJs:0.5", call: "99-44, AJs:0.5, ATs, KQs-KTs, QJs, JTs, T9s, AQo" },
        BTN: { raise: "99+, AKs, AKo, AQs, AJs, AQo:0.5", call: "88-22, ATs-A8s, KQs-KTs, QJs-QTs, JTs, T9s, 98s, AQo:0.5, AJo, KQo" },
        SB: { raise: "99+, AJs+, KQs, AQo+", call: "88-66, ATs, KJs" },
        BB: { raise: "TT+, AJs+, AQo+", call: "99-22, ATs-A2s, KQs-K7s, QJs-Q8s, JTs-J8s, T9s-T7s, 98s-97s, 87s-86s, 76s, 65s, 54s, AJo-A9o, KQo-KTo, QJo-QTo, JTo" },
      },
      late: {
        BTN: { raise: "88+, ATs+, KQs, AJo+, A5s:0.5", call: "77-22, A9s-A6s, A5s:0.5, KJs-K9s, QJs-Q9s, JTs-J9s, T9s, 98s, 87s, ATo, KQo-KJo, QJo" },
        SB: { raise: "77+, A8s+, A5s-A4s, KTs+, QJs, ATo+, KQo", call: "66-44, A7s-A6s, K9s, QTs, JTs, T9s, KJo" },
        BB: {
          raise: "99+, ATs+, KQs, AJo+, A5s:0.5",
          call: "88-22, A9s-A6s, A5s:0.5, A4s-A2s, KJs-K2s, QJs-Q5s, JTs-J7s, T9s-T7s, 98s-96s, 87s-85s, 76s-75s, 65s-64s, 54s-53s, 43s, ATo-A2o, KQo-K8o, QJo-Q9o, JTo-J9o, T9o-T8o, 98o, 87o",
        },
      },
    },
    "15-20bb": {
      early: {
        "UTG+1": { raise: "TT+, AQs+, AKo", call: "99-66, AJs, KQs" },
        LJ: { raise: "TT+, AQs+, AKo", call: "99-66, AJs, KQs" },
        HJ: { raise: "TT+, AQs+, AKo", call: "99-66, AJs, KQs, AQo" },
        CO: { raise: "TT+, AQs+, AQo+", call: "99-55, AJs-ATs, KQs-KJs, QJs, JTs" },
        BTN: { raise: "TT+, AQs+, AQo+", call: "99-55, AJs-ATs, KQs-KJs, QJs, JTs" },
        SB: { raise: "99+, AJs+, KQs, AQo+", call: "" },
        BB: { raise: "TT+, AQs+, AKo", call: "99-22, AJs-A2s, KQs-K9s, QJs-Q9s, JTs-J9s, T9s, 98s, 87s, 76s, AQo-ATo, KQo-KJo, QJo" },
      },
      middle: {
        HJ: { raise: "TT+, AQs+, AKo", call: "99-66, AJs, KQs, AQo" },
        CO: { raise: "99+, AJs+, KQs, AQo+", call: "88-55, ATs, KJs, QJs, JTs" },
        BTN: { raise: "88+, ATs+, KQs, AJo+", call: "77-22, A9s-A8s, KJs-KTs, QJs, JTs, T9s, KQo" },
        SB: { raise: "88+, ATs+, KQs, AJo+, KQo", call: "" },
        BB: { raise: "99+, AJs+, KQs, AQo+", call: "88-22, ATs-A2s, KJs-K7s, QJs-Q8s, JTs-J8s, T9s-T8s, 98s, 87s, 76s, 65s, AJo-A8o, KQo-KTo, QJo-QTo, JTo" },
      },
      late: {
        BTN: { raise: "77+, A9s+, A5s, KJs+, ATo+, KQo", call: "66-22, A8s-A6s, KTs-K9s, QJs-QTs, JTs, T9s, 98s, KJo, QJo" },
        SB: { raise: "66+, A7s+, A5s-A4s, KTs+, QTs+, JTs, A9o+, KJo+", call: "" },
        BB: {
          raise: "88+, A9s+, KTs+, QJs, ATo+, KQo",
          call: "77-22, A8s-A2s, K9s-K2s, QTs-Q5s, JTs-J7s, T9s-T7s, 98s-96s, 87s-86s, 76s-75s, 65s-64s, 54s, A9o-A2o, KJo-K8o, QJo-Q9o, JTo-J9o, T9o, 98o",
        },
      },
    },
  },
};
