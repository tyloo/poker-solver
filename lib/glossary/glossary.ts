/** Glossary topics in page order. */
export const GLOSSARY_TOPICS = ["numbers", "actions", "cards", "table", "ranges", "player-types", "solver"] as const;
export type GlossaryTopic = (typeof GLOSSARY_TOPICS)[number];

export const GLOSSARY_TOPIC_LABELS: Record<GlossaryTopic, string> = {
  actions: "Actions",
  cards: "Cards and streets",
  numbers: "Numbers the tools show",
  "player-types": "Player types",
  ranges: "Hands, ranges and Charts",
  solver: "Solver and theory",
  table: "Table, stacks and tournament",
};

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
export function groupByTopic(terms: readonly GlossaryTerm[]): GlossaryGroup[] {
  return GLOSSARY_TOPICS.map((topic) => ({ label: GLOSSARY_TOPIC_LABELS[topic], terms: terms.filter((entry) => entry.topic === topic), topic })).filter(
    (group) => group.terms.length > 0,
  );
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
