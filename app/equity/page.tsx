import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayingCard } from "@/components/playing-card";
import { ToolHeader } from "@/components/tool-header";
import { EquityTool } from "./equity-tool";

export const metadata: Metadata = { title: "Equity" };

function Skeleton() {
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {[1, 2].map((player) => (
        <li key={player} className="rounded-2xl bg-booth p-4">
          <p className="m-0 mb-3 font-bold font-display text-2xl leading-none">Player {player}</p>
          <div className="flex gap-3">
            <PlayingCard card={null} size="sm" />
            <PlayingCard card={null} size="sm" />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function EquityPage() {
  return (
    <>
      <ToolHeader title="Equity" lede="How often each hand or range wins at showdown, for up to eight players." />
      <Suspense fallback={<Skeleton />}>
        <EquityTool />
      </Suspense>
    </>
  );
}
