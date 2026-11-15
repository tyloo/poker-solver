import type { OpenChartFile } from "@/lib/charts/chart-files";

/**
 * Open: folded to you. Raise 2.5bb at 40bb+, 2bb at 25bb and 15–20bb; fold is the remainder.
 * The SB, facing only the BB, also limps.
 *
 * Baseline starting points: common 8-max tournament opening ranges without antes, not yet
 * tuned to the league. Set `baseline: false` once you have adjusted them from session results.
 */
export const OPEN_CHARTS: OpenChartFile = {
  baseline: true,
  tiers: {
    "40bb+": {
      UTG: { raise: "66+, A9s+, A5s, KTs+, QTs+, JTs, T9s, AJo+, KQo" },
      "UTG+1": { raise: "55+, A8s+, A5s-A4s, KTs+, QTs+, JTs, T9s, 98s, ATo+, KQo" },
      LJ: { raise: "44+, A7s+, A5s-A2s, K9s+, Q9s+, J9s+, T9s, 98s, 87s, ATo+, KJo+" },
      HJ: { raise: "33+, A2s+, K8s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, ATo+, KJo+, QJo" },
      CO: { raise: "22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, 65s, A9o+, KTo+, QTo+, JTo" },
      BTN: { raise: "22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 96s+, 86s+, 75s+, 64s+, 54s, A2o+, K9o+, Q9o+, J9o+, T9o, 98o" },
      SB: {
        raise: "77+, A8s+, A5s, KTs+, QTs+, JTs, ATo+, KJo+, A4s:0.5",
        limp: "66-22, A7s-A6s, A3s-A2s, K9s-K2s, Q9s-Q4s, J9s-J6s, T9s-T6s, 96s+, 85s+, 75s+, 64s+, 53s+, 43s, A9o-A2o, KTo-K8o, QJo-Q9o, JTo-J9o, T9o, 98o, A4s:0.5",
      },
    },
    "25bb": {
      UTG: { raise: "55+, A9s+, A5s, KTs+, QTs+, JTs, AJo+, KQo" },
      "UTG+1": { raise: "44+, A8s+, A5s-A4s, KTs+, QTs+, JTs, T9s, ATo+, KQo" },
      LJ: { raise: "33+, A7s+, A5s-A3s, K9s+, Q9s+, J9s+, T9s, ATo+, KJo+" },
      HJ: { raise: "22+, A2s+, K8s+, Q9s+, J9s+, T9s, 98s, ATo+, KTo+, QJo" },
      CO: { raise: "22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 98s, 87s, A8o+, A5o, KTo+, QTo+, JTo" },
      BTN: { raise: "22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 86s+, 75s+, 65s, 54s, A2o+, K8o+, Q9o+, J9o+, T9o" },
      SB: {
        raise: "66+, A2s+, K9s+, QTs+, JTs, A8o+, KJo+",
        limp: "55-22, K8s-K2s, Q9s-Q4s, J9s-J6s, T9s-T6s, 96s+, 85s+, 75s+, 64s+, 54s, A7o-A2o, KTo-K8o, QJo-Q9o, JTo-J9o, T9o, 98o",
      },
    },
    "15-20bb": {
      UTG: { raise: "66+, A9s+, KTs+, QTs+, JTs, AJo+, KQo" },
      "UTG+1": { raise: "55+, A8s+, A5s, KTs+, QTs+, JTs, ATo+, KQo" },
      LJ: { raise: "44+, A7s+, A5s-A4s, K9s+, QTs+, JTs, ATo+, KJo+" },
      HJ: { raise: "33+, A2s+, K9s+, Q9s+, J9s+, T9s, A9o+, KJo+, QJo" },
      CO: { raise: "22+, A2s+, K7s+, Q8s+, J8s+, T8s+, 98s, A7o+, A5o, KTo+, QTo+, JTo" },
      BTN: { raise: "22+, A2s+, K3s+, Q6s+, J7s+, T7s+, 97s+, 87s, 76s, A2o+, K8o+, Q9o+, J9o+, T9o" },
      SB: {
        raise: "55+, A2s+, K8s+, Q9s+, J9s+, T9s, A7o+, KTo+, QJo",
        limp: "44-22, K7s-K2s, Q8s-Q5s, J8s-J7s, T8s-T7s, 97s+, 86s+, 76s, 65s, A6o-A2o, K9o-K7o, QTo, JTo",
      },
    },
  },
};
