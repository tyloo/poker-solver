import { Suspense } from "react";
import { PlayingCard } from "@/components/playing-card";
import { ToolHeader } from "@/components/tool-header";
import type { Locale } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";
import { EquityTool } from "./equity-tool";

function Skeleton({ locale }: { locale: Locale }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {[0, 1].map((player) => (
        <li key={player} className="rounded-2xl bg-booth p-4">
          <p className="m-0 mb-3 font-bold font-display text-2xl leading-none">{messages(locale).equity.player(player)}</p>
          <div className="flex gap-3">
            <PlayingCard card={null} size="sm" />
            <PlayingCard card={null} size="sm" />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function EquityPage({ locale }: { locale: Locale }) {
  const { title, lede } = messages(locale).tools.equity;
  return (
    <>
      <ToolHeader title={title} lede={lede} />
      <Suspense fallback={<Skeleton locale={locale} />}>
        <EquityTool />
      </Suspense>
    </>
  );
}
