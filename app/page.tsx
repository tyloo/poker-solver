import { Suspense } from "react";
import { PlayingCard } from "@/components/playing-card";
import { ToolHeader } from "@/components/tool-header";
import { SampleHand } from "./sample-hand";

export default function AdvisorPage() {
  return (
    <>
      <ToolHeader title="Advisor" lede="Pick your hand, seat and stack, and get the play from your charts." />
      <Suspense
        fallback={
          <div className="flex gap-4 pl-1">
            <PlayingCard card={null} className="-rotate-3" />
            <PlayingCard card={null} className="mt-2 rotate-2" />
          </div>
        }
      >
        <SampleHand />
      </Suspense>
    </>
  );
}
