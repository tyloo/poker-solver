import { Suspense } from "react";
import { PlayingCard } from "@/components/playing-card";
import { ToolHeader } from "@/components/tool-header";
import { VerdictCard } from "@/components/verdict-card";
import type { Locale } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";
import { AdvisorTool } from "./advisor-tool";

export function AdvisorPage({ locale }: { locale: Locale }) {
  const t = messages(locale);
  return (
    <>
      <ToolHeader title={t.tools.advisor.title} lede={t.tools.advisor.lede} />
      <Suspense
        fallback={
          <div className="flex items-stretch gap-4">
            <div className="flex shrink-0 items-start gap-1.5 self-center pl-1">
              <PlayingCard card={null} size="md" className="-rotate-3" />
              <PlayingCard card={null} size="md" className="mt-1.5 rotate-2" />
            </div>
            <VerdictCard className="min-w-0 flex-1" label={t.advisor.chartSays} verdict={null} prompt={t.advisor.prompts.hand} flipKey="" />
          </div>
        }
      >
        <AdvisorTool />
      </Suspense>
    </>
  );
}
