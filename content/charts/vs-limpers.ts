import type { VsLimpersChartFile } from "@/lib/charts/chart-files";

/**
 * Vs limpers: one or more players have limped before you, nobody has raised. Iso-raise (`raise`)
 * or overlimp (`limp`, a complete from the SB); fold is the remainder. The BB only lists its
 * raises: it checks everything else, which also covers the BB facing an SB limp.
 *
 * Baseline starting points: common live-tournament isolation ranges (limpers are usually wide
 * and weak), not yet tuned to the league. Set `baseline: false` once you have adjusted them.
 */
export const VS_LIMPERS_CHARTS: VsLimpersChartFile = {
  baseline: true,
  tiers: {
    "40bb+": {
      "1": {
        "UTG+1": { raise: "88+, ATs+, KTs+, QJs, AJo+, KQo", limp: "77-22, A9s-A2s, K9s, QTs, JTs, T9s, 98s, 87s, 76s, 65s" },
        LJ: { raise: "88+, ATs+, KTs+, QJs, AJo+, KQo", limp: "77-22, A9s-A2s, K9s, QTs, JTs, T9s, 98s, 87s, 76s, 65s" },
        HJ: { raise: "88+, ATs+, KTs+, QJs, AJo+, KQo", limp: "77-22, A9s-A2s, K9s, QTs, JTs, T9s, 98s, 87s, 76s, 65s" },
        CO: { raise: "77+, A9s+, KTs+, QTs+, JTs, ATo+, KJo+", limp: "66-22, A8s-A2s, K9s-K8s, Q9s, J9s, T9s, 98s, 87s, 76s, 65s, 54s" },
        BTN: {
          raise: "66+, A8s+, A5s, K9s+, QTs+, JTs, T9s, ATo+, KJo+, QJo",
          limp: "55-22, A7s-A6s, A4s-A2s, K8s-K5s, Q9s-Q8s, J9s-J8s, T8s, 98s-97s, 87s-86s, 76s, 65s, 54s, KTo, QTo, JTo",
        },
        SB: {
          raise: "88+, ATs+, KJs+, AJo+, KQo",
          limp: "77-22, A9s-A2s, KTs-K2s, QJs-Q5s, JTs-J7s, T9s-T7s, 98s-96s, 87s-86s, 76s-75s, 65s-64s, 54s, 43s, ATo-A7o, KJo-K9o, QJo-Q9o, JTo-J9o, T9o, 98o",
        },
        BB: { raise: "88+, ATs+, KJs+, AJo+, KQo" },
      },
      "2+": {
        LJ: { raise: "TT+, AJs+, KQs, AQo+", limp: "99-22, ATs-A2s, KJs-K9s, QJs-Q9s, JTs-J9s, T9s, 98s, 87s, 76s, 65s" },
        HJ: { raise: "TT+, AJs+, KQs, AQo+", limp: "99-22, ATs-A2s, KJs-K9s, QJs-Q9s, JTs-J9s, T9s, 98s, 87s, 76s, 65s" },
        CO: { raise: "99+, AJs+, KQs, AQo+", limp: "88-22, ATs-A2s, KJs-K8s, QJs-Q9s, JTs-J9s, T9s-T8s, 98s, 87s, 76s, 65s, 54s" },
        BTN: { raise: "99+, ATs+, KJs+, AJo+, KQo", limp: "88-22, A9s-A2s, KTs-K6s, QJs-Q8s, JTs-J8s, T9s-T8s, 98s-97s, 87s-86s, 76s-75s, 65s, 54s, KJo, QJo" },
        SB: {
          raise: "TT+, AJs+, KQs, AQo+",
          limp: "99-22, ATs-A2s, KJs-K2s, QJs-Q5s, JTs-J7s, T9s-T7s, 98s-96s, 87s-85s, 76s-75s, 65s-64s, 54s-53s, 43s, AJo-A8o, KQo-K9o, QJo-Q9o, JTo-J9o, T9o, 98o",
        },
        BB: { raise: "TT+, AJs+, KQs, AQo+" },
      },
    },
    "25bb": {
      "1": {
        "UTG+1": { raise: "77+, ATs+, KTs+, QJs, AJo+, KQo", limp: "66-22, A9s-A2s, QTs, JTs, T9s, 98s" },
        LJ: { raise: "77+, ATs+, KTs+, QJs, AJo+, KQo", limp: "66-22, A9s-A2s, QTs, JTs, T9s, 98s" },
        HJ: { raise: "77+, ATs+, KTs+, QJs, AJo+, KQo", limp: "66-22, A9s-A2s, QTs, JTs, T9s, 98s" },
        CO: { raise: "66+, A8s+, A5s, KTs+, QTs+, JTs, ATo+, KJo+", limp: "55-22, A7s-A6s, A4s-A2s, K9s, Q9s, J9s, T9s, 98s, 87s" },
        BTN: { raise: "55+, A7s+, A5s-A4s, K9s+, QTs+, JTs, T9s, A9o+, KJo+, QJo", limp: "44-22, A6s, A3s-A2s, K8s-K6s, Q9s, J9s, T8s, 98s, 87s, 76s, 65s, KTo, QTo, JTo" },
        SB: {
          raise: "77+, A9s+, KTs+, QJs, ATo+, KQo",
          limp: "66-22, A8s-A2s, K9s-K2s, QTs-Q5s, JTs-J7s, T9s-T7s, 98s-96s, 87s-86s, 76s-75s, 65s-64s, 54s, A9o-A7o, KJo-K9o, QJo-Q9o, JTo-J9o, T9o",
        },
        BB: { raise: "77+, A9s+, KTs+, QJs, ATo+, KQo" },
      },
      "2+": {
        LJ: { raise: "99+, AJs+, KQs, AQo+", limp: "88-22, ATs-A2s, KJs-KTs, QJs-QTs, JTs, T9s, 98s, 87s" },
        HJ: { raise: "99+, AJs+, KQs, AQo+", limp: "88-22, ATs-A2s, KJs-KTs, QJs-QTs, JTs, T9s, 98s, 87s" },
        CO: { raise: "99+, ATs+, KQs, AJo+", limp: "88-22, A9s-A2s, KJs-K9s, QJs-Q9s, JTs-J9s, T9s, 98s, 87s, 76s" },
        BTN: { raise: "88+, ATs+, KJs+, AJo+, KQo", limp: "77-22, A9s-A2s, KTs-K8s, QJs-Q9s, JTs-J9s, T9s-T8s, 98s, 87s, 76s, 65s" },
        SB: {
          raise: "99+, AJs+, KQs, AQo+",
          limp: "88-22, ATs-A2s, KJs-K2s, QJs-Q6s, JTs-J7s, T9s-T7s, 98s-96s, 87s-86s, 76s-75s, 65s, 54s, AJo-A9o, KQo-KTo, QJo-QTo, JTo",
        },
        BB: { raise: "99+, AJs+, KQs, AQo+" },
      },
    },
    "15-20bb": {
      "1": {
        "UTG+1": { raise: "66+, ATs+, KTs+, QJs, ATo+, KQo", limp: "55-22" },
        LJ: { raise: "66+, ATs+, KTs+, QJs, ATo+, KQo", limp: "55-22" },
        HJ: { raise: "66+, ATs+, KTs+, QJs, ATo+, KQo", limp: "55-22" },
        CO: { raise: "55+, A8s+, A5s, KTs+, QTs+, JTs, ATo+, KJo+", limp: "44-22, T9s, 98s" },
        BTN: { raise: "44+, A2s+, K9s+, QTs+, JTs, T9s, A8o+, KTo+, QJo", limp: "33-22, 98s, 87s" },
        SB: {
          raise: "55+, A7s+, A5s, K9s+, QTs+, JTs, A9o+, KJo+",
          limp: "44-22, A6s, A4s-A2s, K8s-K2s, Q9s-Q5s, J9s-J7s, T9s-T7s, 98s-96s, 87s-86s, 76s, 65s, 54s, A8o-A5o, KTo-K9o, QTo+, JTo",
        },
        BB: { raise: "66+, A8s+, A5s, KTs+, QTs+, JTs, ATo+, KJo+" },
      },
      "2+": {
        LJ: { raise: "88+, AJs+, KQs, AQo+", limp: "77-22" },
        HJ: { raise: "88+, AJs+, KQs, AQo+", limp: "77-22" },
        CO: { raise: "77+, ATs+, KQs, AJo+", limp: "66-22, KJs, QJs, JTs" },
        BTN: { raise: "77+, ATs+, KJs+, AJo+, KQo", limp: "66-22, A9s-A6s, KTs, QTs+, JTs, T9s, 98s" },
        SB: {
          raise: "88+, ATs+, KQs, AJo+",
          limp: "77-22, A9s-A2s, KJs-K2s, QJs-Q6s, JTs-J7s, T9s-T7s, 98s-96s, 87s-86s, 76s, 65s, 54s, ATo-A8o, KQo-KTo, QJo-QTo, JTo",
        },
        BB: { raise: "88+, ATs+, KQs, AJo+" },
      },
    },
  },
};
