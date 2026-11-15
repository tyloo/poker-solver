import { Suspense } from "react";
import { PlayingCard } from "@/components/playing-card";
import { ToolHeader } from "@/components/tool-header";
import { VerdictCard } from "@/components/verdict-card";
import { AdvisorTool } from "./advisor-tool";

export default function AdvisorPage() {
  return (
    <>
      <ToolHeader title="Advisor" lede="Pick your hand, seat and stack, and get the play from your charts." />
      <Suspense
        fallback={
          <div className="flex items-stretch gap-4">
            <div className="flex shrink-0 items-start gap-1.5 self-center pl-1">
              <PlayingCard card={null} size="md" className="-rotate-3" />
              <PlayingCard card={null} size="md" className="mt-1.5 rotate-2" />
            </div>
            <VerdictCard className="min-w-0 flex-1" label="Your Chart says" verdict={null} prompt="Pick your hand" flipKey="" />
          </div>
        }
      >
        <AdvisorTool />
      </Suspense>
    </>
  );
}
