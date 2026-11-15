import type { Metadata } from "next";
import { linkButton } from "@/components/buttons";
import { atkinson, bigShoulders } from "@/lib/fonts";
import { localeHref } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";
import "./globals.css";

export const metadata: Metadata = { title: "404" };

const LANGUAGES = [
  { locale: "en", t: messages("en") },
  { locale: "fr", t: messages("fr") },
] as const;

/** Unknown paths in either language. With two root layouts (`app/(en)`, `app/fr`), no layout can host a 404. */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${bigShoulders.variable} ${atkinson.variable}`}>
      <body className="bg-night font-sans text-[1.0625rem] text-chalk leading-[1.5] antialiased">
        <main className="mx-auto flex min-h-dvh max-w-[30rem] flex-col gap-6 px-5 pt-[max(1.75rem,env(safe-area-inset-top))]">
          <h1 className="m-0 font-display font-extrabold text-[3.25rem] leading-[0.9]">404</h1>
          {LANGUAGES.map(({ locale, t }) => (
            <p key={locale} lang={locale} className="m-0 text-dust">
              {t.notFound.message}
            </p>
          ))}
          <div className="flex flex-wrap gap-3">
            {LANGUAGES.map(({ locale, t }) => (
              <a key={locale} href={localeHref(locale, "/")} lang={locale} className={linkButton}>
                {t.tabs.advisor}
              </a>
            ))}
          </div>
        </main>
      </body>
    </html>
  );
}
