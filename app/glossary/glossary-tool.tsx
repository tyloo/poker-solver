"use client";

import { useEffect, useState } from "react";
import { textButton } from "@/components/buttons";
import { GLOSSARY } from "@/content/glossary";
import { filterTerms, groupByTopic } from "@/lib/glossary/glossary";
import { codecs, useUrlState } from "@/lib/url-state";
import { GlossaryList } from "./glossary-list";

const queryCodec = codecs.string("");

export function FilterField({ value, onChange, onClear }: { value: string; onChange?: (value: string) => void; onClear?: () => void }) {
  return (
    <div>
      <label htmlFor="glossary-filter" className="mb-1.5 block text-dust">
        Find a term or abbreviation
      </label>
      <div className="flex items-center gap-1">
        <input
          id="glossary-filter"
          type="search"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          value={value}
          readOnly={!onChange}
          onChange={(event) => onChange?.(event.target.value)}
          className="block h-12 w-full min-w-0 rounded-xl border-2 border-booth bg-booth px-4 text-chalk text-xl focus-visible:border-chalk focus-visible:outline-none"
        />
        {value !== "" && onClear && (
          <button type="button" onClick={onClear} className={`-mr-4 shrink-0 ${textButton}`}>
            Clear<span className="sr-only"> the filter</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function GlossaryTool() {
  const [query, setQuery] = useUrlState("q", queryCodec);
  const [text, setText] = useState(query);
  const [reported, setReported] = useState(query);
  const [target, setTarget] = useState<string | null>(null);

  // This list replaces the prerendered one, which loses the browser's :target, so track the hash here.
  useEffect(() => {
    const read = () => setTarget(decodeURIComponent(window.location.hash.slice(1)) || null);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  // The URL changed from outside (back button): show its filter.
  if (query !== reported) {
    setReported(query);
    setText(query);
  }

  const change = (next: string) => {
    setText(next);
    setReported(next);
    setQuery(next);
  };
  const terms = filterTerms(GLOSSARY, text);

  return (
    <div className="flex flex-col gap-6">
      <FilterField value={text} onChange={change} onClear={() => change("")} />
      <p aria-live="polite" className="-mt-3 mb-0 min-h-[1.5em] text-dust">
        {text.trim() === "" ? "" : terms.length === 0 ? `No term matches “${text.trim()}”.` : `${terms.length} ${terms.length === 1 ? "term" : "terms"}`}
      </p>
      <GlossaryList groups={groupByTopic(terms)} target={target} />
    </div>
  );
}
