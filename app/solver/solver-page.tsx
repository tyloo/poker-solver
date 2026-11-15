import { Suspense } from "react";
import { PlayingCard } from "@/components/playing-card";
import { ToolHeader } from "@/components/tool-header";
import type { Locale } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";
import { SolverTool } from "./solver-tool";

function Skeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <div className="h-20 rounded-2xl bg-booth" />
      <div className="h-36 rounded-2xl bg-booth" />
      <div className="mt-5 flex gap-2">
        {[1, 2, 3, 4, 5].map((card) => (
          <PlayingCard key={card} card={null} size="md" />
        ))}
      </div>
    </div>
  );
}

export function SolverPage({ locale }: { locale: Locale }) {
  const { title, lede } = messages(locale).tools.solver;
  return (
    <>
      <ToolHeader title={title} lede={lede} />
      <Suspense fallback={<Skeleton />}>
        <SolverTool />
      </Suspense>
    </>
  );
}
