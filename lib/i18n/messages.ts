import { en, type Messages } from "./en";
import { fr } from "./fr";
import type { Locale } from "./locale";

export type { Messages };

const MESSAGES: Record<Locale, Messages> = { en, fr };

/** The UI text of a language. */
export const messages = (locale: Locale): Messages => MESSAGES[locale];
