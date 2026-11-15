/** A share from 0 to 1 as a percentage, e.g. 0.704 → "70%", or "70.4%" with one decimal. */
export const formatPercent = (share: number, decimals = 0) => `${(share * 100).toFixed(decimals)}%`;
