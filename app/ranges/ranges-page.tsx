import { Suspense } from "react";
import { ToolHeader } from "@/components/tool-header";
import { assertChartsValid } from "@/lib/charts/charts";
import type { Locale } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";
import { RangesTool } from "./ranges-tool";

const SQUARES = Array.from({ length: 169 }, (_, i) => i);

export function RangesPage({ locale }: { locale: Locale }) {
  // Runs while prerendering, so an invalid Chart file fails the build.
  assertChartsValid();
  const { title, lede } = messages(locale).tools.ranges;

  return (
    <>
      <ToolHeader title={title} lede={lede} />
      <Suspense
        fallback={
          <div aria-hidden="true" className="grid grid-cols-13 gap-px">
            {SQUARES.map((i) => (
              <span key={i} className="aspect-square rounded-[3px] bg-booth" />
            ))}
          </div>
        }
      >
        <RangesTool />
      </Suspense>
    </>
  );
}
