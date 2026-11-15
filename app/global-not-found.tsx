import type { Metadata } from "next";
import { primaryButton } from "@/components/buttons";
import { atkinson, bigShoulders } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = { title: "404" };

/** Unknown paths in either language. With two root layouts (`app/(en)`, `app/fr`), no layout can host a 404. */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${bigShoulders.variable} ${atkinson.variable}`}>
      <body className="bg-night font-sans text-[1.0625rem] text-chalk leading-[1.5] antialiased">
        <main className="mx-auto flex min-h-dvh max-w-[30rem] flex-col gap-6 px-5 pt-[max(1.75rem,env(safe-area-inset-top))]">
          <h1 className="m-0 font-display font-extrabold text-[3.25rem] leading-[0.9]">404</h1>
          <p className="m-0 text-dust">This page does not exist.</p>
          <p lang="fr" className="m-0 text-dust">
            Cette page n’existe pas.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/" className={`inline-flex items-center ${primaryButton}`}>
              Advisor
            </a>
            <a href="/fr" lang="fr" className={`inline-flex items-center ${primaryButton}`}>
              Conseil
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
