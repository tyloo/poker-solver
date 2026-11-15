import type { Metadata } from "next";
import { Suspense } from "react";
import { ToolHeader } from "@/components/tool-header";
import { GLOSSARY } from "@/content/glossary";
import { groupByTopic } from "@/lib/glossary/glossary";
import { GlossaryList } from "./glossary-list";
import { FilterField, GlossaryTool } from "./glossary-tool";

export const metadata: Metadata = { title: "Glossary" };

export default function GlossaryPage() {
  return (
    <>
      <ToolHeader title="Glossary" lede="The poker terms and abbreviations the app uses, in plain English." />
      <Suspense
        fallback={
          // The full list is in the static HTML, so /glossary#<term> scrolls to it on load.
          <div className="flex flex-col gap-6">
            <FilterField value="" />
            <p className="-mt-3 mb-0 min-h-[1.5em]" />
            <GlossaryList groups={groupByTopic(GLOSSARY)} />
          </div>
        }
      >
        <GlossaryTool />
      </Suspense>
    </>
  );
}
