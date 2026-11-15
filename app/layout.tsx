import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ServiceWorker } from "@/components/service-worker";
import { TabBar } from "@/components/tab-bar";
import { atkinson, bigShoulders } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Poker Solver", template: "%s | Poker Solver" },
  description: "Preflop charts, equity, a postflop solver and quick advice for live 8-max tournaments.",
  appleWebApp: { capable: true, title: "Solver", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#1b1527",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bigShoulders.variable} ${atkinson.variable}`}>
      <body className="bg-night font-sans text-[1.0625rem] text-chalk leading-[1.5] antialiased">
        <main className="mx-auto flex min-h-dvh max-w-[30rem] flex-col px-5 pt-[max(1.75rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
        <TabBar />
        <ServiceWorker />
      </body>
    </html>
  );
}
