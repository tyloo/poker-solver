import { Suspense } from "react";
import { ToolHeader } from "@/components/tool-header";
import { glossaryTerms, groupByTopic } from "@/lib/glossary/glossary";
import type { Locale } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";
import { GlossaryList } from "./glossary-list";
import { FilterField, GlossaryTool } from "./glossary-tool";

export function GlossaryPage({ locale }: { locale: Locale }) {
  const { title, lede } = messages(locale).tools.glossary;
  return (
    <>
      <ToolHeader title={title} lede={lede} />
      <Suspense
        fallback={
          // The full list is in the static HTML, so /glossary#<term> scrolls to it on load.
          <div className="flex flex-col gap-6">
            <FilterField value="" />
            <p className="-mt-3 mb-0 min-h-[1.5em]" />
            <GlossaryList groups={groupByTopic(glossaryTerms(locale), locale)} />
          </div>
        }
      >
        <GlossaryTool />
      </Suspense>
    </>
  );
}
