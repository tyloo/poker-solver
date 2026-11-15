import { GLOSSARY } from "@/content/glossary";
import { GLOSSARY_FR } from "@/content/glossary-fr";
import type { Locale } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";

/** Glossary topics in page order. */
export const GLOSSARY_TOPICS = ["numbers", "actions", "cards", "table", "ranges", "player-types", "solver"] as const;
export type GlossaryTopic = (typeof GLOSSARY_TOPICS)[number];

export type GlossaryTerm = {
  /** Stable anchor: `/glossary#<id>`. Keep it when the wording changes, other tools link to it. */
  id: string;
  term: string;
  abbreviation?: string;
  /** Other names the filter should find, e.g. "shove" for Push. Not shown. */
  aliases?: readonly string[];
  topic: GlossaryTopic;
  definition: string;
  example?: string;
};

/** A term in another language; the anchor, topic and order come from the English term. */
export type GlossaryTranslation = Pick<GlossaryTerm, "term" | "abbreviation" | "aliases" | "definition" | "example">;

export const MAX_DEFINITION_LENGTH = 320;

export const glossaryHref = (id: string) => `/glossary#${id}`;

/** The term, its abbreviation and its aliases. */
export const termNames = ({ term, abbreviation, aliases = [] }: GlossaryTerm): string[] => [term, ...(abbreviation === undefined ? [] : [abbreviation]), ...aliases];

/** Lower case with spaces, hyphens, dashes and other punctuation dropped, so "3bet" finds "3-bet". */
const normalise = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}×]/gu, "");

/** Terms whose name, abbreviation or an alias contains the filter text, in data order. */
export function filterTerms(terms: readonly GlossaryTerm[], query: string): GlossaryTerm[] {
  const needle = normalise(query);
  if (needle === "") return [...terms];
  return terms.filter((entry) => termNames(entry).some((name) => normalise(name).includes(needle)));
}

export type GlossaryGroup = { topic: GlossaryTopic; label: string; terms: GlossaryTerm[] };

/** Terms grouped in topic order; topics without terms are left out. */
export function groupByTopic(terms: readonly GlossaryTerm[], locale: Locale): GlossaryGroup[] {
  const labels = messages(locale).glossary.topics;
  return GLOSSARY_TOPICS.map((topic) => ({ label: labels[topic], terms: terms.filter((entry) => entry.topic === topic), topic })).filter((group) => group.terms.length > 0);
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Problems in glossary data: duplicate or malformed anchors, duplicate terms, empty text, unknown topics, long definitions. */
export function glossaryErrors(terms: readonly GlossaryTerm[]): string[] {
  const errors: string[] = [];
  const anchors = new Set<string>();
  const names = new Set<string>();
  for (const entry of terms) {
    const label = entry.term.trim() || entry.id;
    if (anchors.has(entry.id)) errors.push(`Duplicate anchor "${entry.id}"`);
    anchors.add(entry.id);
    const name = entry.term.trim().toLowerCase();
    if (name !== "" && names.has(name)) errors.push(`Duplicate term "${name}"`);
    names.add(name);
    if (!SLUG.test(entry.id)) errors.push(`${label}: anchor "${entry.id}" must be a lower-case slug`);
    if (entry.term.trim() === "") errors.push(`${label}: empty term`);
    if (entry.abbreviation !== undefined && entry.abbreviation.trim() === "") errors.push(`${label}: empty abbreviation`);
    if (entry.aliases?.some((alias) => alias.trim() === "")) errors.push(`${label}: empty alias`);
    if (!(GLOSSARY_TOPICS as readonly string[]).includes(entry.topic)) errors.push(`${label}: unknown topic "${entry.topic}"`);
    if (entry.definition.trim() === "") errors.push(`${label}: empty definition`);
    if (entry.definition.length > MAX_DEFINITION_LENGTH) errors.push(`${label}: definition is longer than ${MAX_DEFINITION_LENGTH} characters`);
    if (entry.example !== undefined && entry.example.trim() === "") errors.push(`${label}: empty example`);
    if ([entry.definition, entry.example ?? ""].some((text) => text.includes("·"))) errors.push(`${label}: middle dot in the text`);
  }
  return errors;
}

/** French typography for plain-space text: no-break spaces before ":" and "%", inside « », in 1 000; narrow ones before ";", "?" and "!". */
export const frenchTypography = (text: string) =>
  text
    .replace(/ ([:%»])/g, "\u00a0$1")
    .replace(/« /g, "«\u00a0")
    .replace(/ ([;?!])/g, "\u202f$1")
    .replace(/(\d) (?=\d{3}\b)/g, "$1\u202f");

/**
 * Terms translated by id, keeping the English anchors, topics and order. The English names stay searchable.
 * A term without a translation stays in English (the tests require one for every term).
 */
export function translateGlossary(terms: readonly GlossaryTerm[], translations: Readonly<Record<string, GlossaryTranslation>>): GlossaryTerm[] {
  return terms.map((entry) => {
    const translation = translations[entry.id];
    if (!translation) return entry;
    const { term, abbreviation = entry.abbreviation, definition, example } = translation;
    const english = termNames(entry).filter((name) => name !== term && name !== abbreviation);
    return {
      ...entry,
      abbreviation,
      aliases: [...new Set([...(translation.aliases ?? []), ...english])],
      definition: frenchTypography(definition),
      example: example === undefined ? undefined : frenchTypography(example),
      term,
    };
  });
}

const FRENCH_GLOSSARY = translateGlossary(GLOSSARY, GLOSSARY_FR);

/** The Glossary in a language. */
export const glossaryTerms = (locale: Locale): readonly GlossaryTerm[] => (locale === "fr" ? FRENCH_GLOSSARY : GLOSSARY);
