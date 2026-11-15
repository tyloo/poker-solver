"use client";

import { createContext, type ReactNode, use } from "react";
import { type Locale, localeHref } from "@/lib/i18n/locale";
import { type Messages, messages } from "@/lib/i18n/messages";

const LocaleContext = createContext<Locale>("en");

/** Gives client components the page's language, set by the root layout of `/` or `/fr`. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

/** The page's language, its UI text, and `href` to keep in-app links in that language. */
export function useI18n(): { locale: Locale; t: Messages; href: (path: string) => string } {
  const locale = use(LocaleContext);
  return { href: (path) => localeHref(locale, path), locale, t: messages(locale) };
}
