import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { ToolHeader } from "@/components/tool-header";

export const metadata: Metadata = { title: "Ranges" };

export default function RangesPage() {
  return (
    <>
      <ToolHeader title="Ranges" lede="Your preflop charts by situation, seat and stack depth." />
      <ComingSoon>Your charts appear here once they are added to the repo.</ComingSoon>
    </>
  );
}
