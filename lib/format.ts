import type { Locale } from "@/lib/i18n/locale";

const LANGUAGE_TAGS: Record<Locale, string> = { en: "en-US", fr: "fr-FR" };

const formats = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: Locale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const id = `${locale}:${JSON.stringify(options)}`;
  let format = formats.get(id);
  if (!format) {
    format = new Intl.NumberFormat(LANGUAGE_TAGS[locale], options);
    formats.set(id, format);
  }
  return format;
}

/** A share from 0 to 1 as a percentage: 0.819 → "82%", or "81.9%" ("81,9 %" in French) with one decimal. Decimals are fixed unless `minDecimals` is lower. */
export const formatPercent = (share: number, locale: Locale, decimals = 0, minDecimals = decimals) =>
  numberFormat(locale, { maximumFractionDigits: decimals, minimumFractionDigits: minDecimals, style: "percent" }).format(share);

/**
 * A number with `minDecimals` to `maxDecimals` decimals: "12,500" and "2.5" in English, "12 500" and "2,5" in French.
 * Without `grouping` there is no thousands separator, for text fields that parse it back.
 */
export const formatNumber = (value: number, locale: Locale, maxDecimals = 0, minDecimals = 0, grouping = true) =>
  numberFormat(locale, { maximumFractionDigits: maxDecimals, minimumFractionDigits: minDecimals, useGrouping: grouping }).format(value);

/** An amount in big blinds, to 0.01bb: "2.5bb", "2,5bb". */
export const formatBb = (bb: number, locale: Locale) => `${formatNumber(bb, locale, 2)}bb`;

const AND: Record<Locale, string> = { en: "and", fr: "et" };

/** "a, b and c" ("a, b et c"). */
export const formatList = (items: readonly string[], locale: Locale) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} ${AND[locale]} ${items.at(-1)}` : (items[0] ?? ""));

/** The number helpers of a language's UI text (`lib/i18n/en.ts`, `fr.ts`). */
export function formatters(locale: Locale) {
  const pct = (share: number, decimals = 0) => formatPercent(share, locale, decimals);
  return {
    bb: (value: number) => formatBb(value, locale),
    list: (items: readonly string[]) => formatList(items, locale),
    num: (value: number, maxDecimals = 0, minDecimals = 0) => formatNumber(value, locale, maxDecimals, minDecimals),
    pct,
    /** Up to one decimal: "30%", "26.1%". */
    pct1: (share: number) => formatPercent(share, locale, 1, 0),
    /** An exploitability share of the pot, "?" before the first check. */
    potShare: (share: number | null) => (share === null ? "?" : pct(share, 2)),
  };
}
