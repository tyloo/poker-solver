import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { I18nProvider } from "@/components/i18n-provider";
import { ServiceWorker } from "@/components/service-worker";
import { TabBar } from "@/components/tab-bar";
import { atkinson, bigShoulders } from "@/lib/fonts";
import { FRENCH_START_SCRIPT, LANGUAGE_SWITCH_SCRIPT, type Locale, localeHref } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";
import type { Tool } from "@/lib/tools";
import "./globals.css";

/** Site metadata of a language; each root layout (`app/(en)`, `app/fr`) exports it. */
export function rootMetadata(locale: Locale): Metadata {
  const { meta } = messages(locale);
  return {
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: meta.shortName },
    description: meta.description,
    manifest: localeHref(locale, "/manifest.webmanifest"),
    title: { default: meta.name, template: `%s | ${meta.name}` },
  };
}

/** A tool page's title in a language (the Advisor at `/` keeps the site title). */
export const toolMetadata = (locale: Locale, tool: Exclude<Tool, "advisor">): Metadata => ({ title: messages(locale).tools[tool].title });

export const rootViewport: Viewport = {
  themeColor: "#1b1527",
  viewportFit: "cover",
};

/** The document of every page. English and French have a root layout each, so `<html lang>` is right in the static HTML. */
export function RootShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html lang={locale} className={`${bigShoulders.variable} ${atkinson.variable}`}>
      <head>
        {/* Runs before the first paint, so a French phone opening `/` never sees the English page. */}
        {locale === "en" && (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: a constant script (lib/i18n/locale.ts), no user input.
          <script dangerouslySetInnerHTML={{ __html: FRENCH_START_SCRIPT }} />
        )}
        {/* Lets the language link keep the setup when tapped before hydration. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a constant script (lib/i18n/locale.ts), no user input. */}
        <script dangerouslySetInnerHTML={{ __html: LANGUAGE_SWITCH_SCRIPT }} />
      </head>
      <body className="bg-night font-sans text-[1.0625rem] text-chalk leading-[1.5] antialiased">
        <I18nProvider locale={locale}>
          <main className="mx-auto flex min-h-dvh max-w-[30rem] flex-col px-5 pt-[max(1.75rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
            {children}
          </main>
          <TabBar />
        </I18nProvider>
        <ServiceWorker />
        <Analytics />
      </body>
    </html>
  );
}
