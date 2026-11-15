import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayingCard } from "@/components/playing-card";
import { ToolHeader } from "@/components/tool-header";
import { SolverTool } from "./solver-tool";

export const metadata: Metadata = { title: "Solver" };

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

export default function SolverPage() {
  return (
    <>
      <ToolHeader title="Solver" lede="The game-theory strategy for a heads-up flop, turn or river spot." />
      <Suspense fallback={<Skeleton />}>
        <SolverTool />
      </Suspense>
    </>
  );
}
