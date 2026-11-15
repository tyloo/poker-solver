import type { Metadata } from "next";
import { Suspense } from "react";
import { ToolHeader } from "@/components/tool-header";
import { assertChartsValid } from "@/lib/charts/charts";
import { RangesTool } from "./ranges-tool";

export const metadata: Metadata = { title: "Ranges" };

const SQUARES = Array.from({ length: 169 }, (_, i) => i);

export default function RangesPage() {
  // Runs while prerendering, so an invalid Chart file fails the build.
  assertChartsValid();

  return (
    <>
      <ToolHeader title="Ranges" lede="Your preflop charts by situation, seat and stack depth." />
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
