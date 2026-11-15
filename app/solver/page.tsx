import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { ToolHeader } from "@/components/tool-header";

export const metadata: Metadata = { title: "Solver" };

export default function SolverPage() {
  return (
    <>
      <ToolHeader title="Solver" lede="The game-theory strategy for a heads-up turn or river spot." />
      <ComingSoon>Spot setup and solving arrive with the solver engine.</ComingSoon>
    </>
  );
}
