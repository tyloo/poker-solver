import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { ToolHeader } from "@/components/tool-header";

export const metadata: Metadata = { title: "Equity" };

export default function EquityPage() {
  return (
    <>
      <ToolHeader title="Equity" lede="How often each hand or range wins at showdown, for up to eight players." />
      <ComingSoon>Hands, ranges and the board go here once the equity engine is built.</ComingSoon>
    </>
  );
}
