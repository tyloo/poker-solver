"use client";

import { useI18n } from "@/components/i18n-provider";
import type { GlossaryGroup } from "@/lib/glossary/glossary";

/** Terms grouped by topic; each term carries its anchor id, so /glossary#<id> scrolls to it. `target` highlights the linked term. */
export function GlossaryList({ groups, target = null }: { groups: readonly GlossaryGroup[]; target?: string | null }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-10">
      {groups.map(({ topic, label, terms }) => (
        <section key={topic} aria-labelledby={`topic-${topic}`}>
          <h2 id={`topic-${topic}`} className="m-0 mb-2 font-bold font-display text-3xl leading-none">
            {label}
          </h2>
          <dl className="m-0 flex flex-col">
            {terms.map((entry) => (
              <div key={entry.id} id={entry.id} className={`-mx-4 scroll-mt-6 rounded-2xl px-4 py-3 target:bg-booth ${entry.id === target ? "bg-booth" : ""}`}>
                <dt className="flex flex-wrap items-baseline gap-x-2">
                  <dfn className="font-bold font-display text-2xl not-italic leading-tight">{entry.abbreviation ?? entry.term}</dfn>
                  {entry.abbreviation && <span className="font-bold text-dust">{entry.term}</span>}
                </dt>
                <dd className="m-0 mt-1">
                  <p className="m-0">{entry.definition}</p>
                  {entry.example && <p className="m-0 mt-1 text-dust">{t.glossary.example(entry.example)}</p>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
