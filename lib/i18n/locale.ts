/** UI languages. English lives at `/`, French under `/fr` (spec: Platform). */
export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

const FRENCH_PREFIX = "/fr";

const isFrenchPath = (pathname: string) => pathname === FRENCH_PREFIX || pathname.startsWith(`${FRENCH_PREFIX}/`);

export const localeOf = (pathname: string): Locale => (isFrenchPath(pathname) ? "fr" : "en");

/** The path without its language prefix: "/fr/equity" → "/equity", "/fr" → "/". */
export function toolPath(pathname: string): string {
  if (!isFrenchPath(pathname)) return pathname;
  return pathname.slice(FRENCH_PREFIX.length).replace(/^\/?$/, "/");
}

/** An in-app link (`/ranges?…`, `/glossary#spr`) in a language: "/" becomes "/fr", "/ranges" becomes "/fr/ranges". */
export function localeHref(locale: Locale, href: string): string {
  if (locale === "en") return href;
  return href.startsWith("/") && !href.startsWith("//") ? `${FRENCH_PREFIX}${href.replace(/^\/(?=[?#]|$)/, "")}` : href;
}

/** The same tool and query string in another language. */
export const switchLocaleHref = (pathname: string, search: string, target: Locale): string => localeHref(target, `${toolPath(pathname)}${search}`);

/**
 * Inline script for the English pages: a session that starts on `/` (no same-origin referrer) on a French
 * phone opens `/fr` with the same query string. It runs before the first paint; nothing is stored.
 */
export const FRENCH_START_SCRIPT = `try{var l=location,r=document.referrer;if(l.pathname==="/"&&!(r&&new URL(r).origin===l.origin)&&/^fr(-|$)/i.test(navigator.language||""))l.replace("/fr"+l.search+l.hash)}catch(e){}`;
