import type { RangeProblem } from "@/lib/poker/range";
import type { Locale } from "./locale";
import { messages } from "./messages";

/** What is wrong with a range string, naming the faulty entry. */
export function rangeErrorText(error: RangeProblem, locale: Locale): string {
  const t = messages(locale).rangeErrors;
  return error.code === "overlap" ? t.overlap(error.name, error.entry) : t[error.code](error.entry);
}
