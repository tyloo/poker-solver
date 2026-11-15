"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { type Locale, switchLocaleHref } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";
import { useI18n } from "./i18n-provider";

function SwitchLink({ search }: { search: string }) {
  const { locale } = useI18n();
  const pathname = usePathname();
  const target: Locale = locale === "en" ? "fr" : "en";
  const { flag, code, switchTo } = messages(target).language;

  return (
    // A plain link: the other language has its own root layout, so this is a full page load anyway.
    // LANGUAGE_SWITCH_SCRIPT (in the root shell) re-points it from the address bar on tap, query string and anchor included,
    // even before hydration, when `search` is still empty.
    <a
      href={switchLocaleHref(pathname, search, target)}
      data-switch-locale={target}
      hrefLang={target}
      lang={target}
      className="-mt-1 -mr-2 flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 font-bold text-dust hover:text-chalk focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2"
    >
      <span aria-hidden="true" className="text-xl leading-none">
        {flag}
      </span>
      {code}
      <span className="sr-only">{`, ${switchTo}`}</span>
    </a>
  );
}

function CurrentSearch() {
  const params = useSearchParams().toString();
  return <SwitchLink search={params ? `?${params}` : ""} />;
}

/** Top-right button to the same tool and query string in the other language. */
export function LanguageSwitch() {
  return (
    <Suspense fallback={<SwitchLink search="" />}>
      <CurrentSearch />
    </Suspense>
  );
}
