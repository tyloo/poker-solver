import { describe, expect, it } from "vitest";
import { GLOSSARY } from "@/content/glossary";
import { GLOSSARY_FR } from "@/content/glossary-fr";
import { messages } from "@/lib/i18n/messages";
import {
  filterTerms,
  frenchTypography,
  GLOSSARY_TOPICS,
  type GlossaryTerm,
  glossaryErrors,
  glossaryHref,
  glossaryTerms,
  groupByTopic,
  termNames,
  translateGlossary,
} from "./glossary";

const term = (fields: Partial<GlossaryTerm> & Pick<GlossaryTerm, "id" | "term">): GlossaryTerm => ({ definition: "A definition.", topic: "actions", ...fields });

const SAMPLE: GlossaryTerm[] = [
  term({ aliases: ["shove", "jam"], id: "push", term: "Push" }),
  term({ id: "three-bet", term: "3-bet" }),
  term({ abbreviation: "SPR", id: "spr", term: "Stack-to-pot ratio", topic: "numbers" }),
  term({ id: "pot-odds", term: "Pot odds", topic: "numbers" }),
  term({ abbreviation: "UTG+1", id: "utg-plus-1", term: "Under the gun +1", topic: "table" }),
  term({ id: "all-in", term: "All-in" }),
];

const ids = (terms: readonly GlossaryTerm[]) => terms.map((entry) => entry.id);

describe("filterTerms", () => {
  it("keeps every term for an empty or blank filter", () => {
    expect(filterTerms(SAMPLE, "")).toEqual(SAMPLE);
    expect(filterTerms(SAMPLE, "   ")).toEqual(SAMPLE);
  });

  it("matches the term, ignoring case", () => {
    expect(ids(filterTerms(SAMPLE, "POT ODDS"))).toEqual(["pot-odds"]);
    expect(ids(filterTerms(SAMPLE, "ratio"))).toEqual(["spr"]);
  });

  it("matches the abbreviation", () => {
    expect(ids(filterTerms(SAMPLE, "spr"))).toEqual(["spr"]);
    expect(ids(filterTerms(SAMPLE, "UTG+1"))).toEqual(["utg-plus-1"]);
  });

  it("matches an alias", () => {
    expect(ids(filterTerms(SAMPLE, "shove"))).toEqual(["push"]);
    expect(ids(filterTerms(SAMPLE, "Jam"))).toEqual(["push"]);
  });

  it("ignores spaces, hyphens and dashes", () => {
    expect(ids(filterTerms(SAMPLE, "3bet"))).toEqual(["three-bet"]);
    expect(ids(filterTerms(SAMPLE, "all in"))).toEqual(["all-in"]);
    expect(ids(filterTerms(SAMPLE, "stack to pot"))).toEqual(["spr"]);
  });

  it("does not search the definitions", () => {
    expect(filterTerms(SAMPLE, "definition")).toEqual([]);
  });

  it("keeps the data order", () => {
    expect(ids(filterTerms(SAMPLE, "pot"))).toEqual(["spr", "pot-odds"]);
  });
});

describe("groupByTopic", () => {
  it("follows the topic order and skips empty topics", () => {
    const groups = groupByTopic(SAMPLE);
    expect(groups.map((group) => group.topic)).toEqual(["numbers", "actions", "table"]);
    expect(ids(groups[0].terms)).toEqual(["spr", "pot-odds"]);
  });
});

describe("glossaryHref", () => {
  it("links to the term's anchor in the page's language", () => {
    expect(glossaryHref("equity", "en")).toBe("/glossary#equity");
    expect(glossaryHref("equity", "fr")).toBe("/fr/glossary#equity");
  });
});

describe("glossaryErrors", () => {
  it("accepts valid terms", () => {
    expect(glossaryErrors(SAMPLE)).toEqual([]);
  });

  it("rejects duplicate anchors and terms", () => {
    expect(glossaryErrors([term({ id: "push", term: "Push" }), term({ id: "push", term: "Shove" })])).toEqual(['Duplicate anchor "push"']);
    expect(glossaryErrors([term({ id: "push", term: "Push" }), term({ id: "push-2", term: "push" })])).toEqual(['Duplicate term "push"']);
  });

  it("rejects anchors that are not lower-case slugs", () => {
    expect(glossaryErrors([term({ id: "Pot odds", term: "Pot odds" })])).toEqual(['Pot odds: anchor "Pot odds" must be a lower-case slug']);
  });

  it("rejects empty text", () => {
    expect(glossaryErrors([term({ definition: " ", id: "push", term: "Push" })])).toEqual(["Push: empty definition"]);
    expect(glossaryErrors([term({ id: "push", term: "" })])).toEqual(["push: empty term"]);
    expect(glossaryErrors([term({ example: "", id: "push", term: "Push" })])).toEqual(["Push: empty example"]);
    expect(glossaryErrors([term({ aliases: ["shove", ""], id: "push", term: "Push" })])).toEqual(["Push: empty alias"]);
    expect(glossaryErrors([term({ abbreviation: "", id: "push", term: "Push" })])).toEqual(["Push: empty abbreviation"]);
  });

  it("rejects unknown topics", () => {
    expect(glossaryErrors([term({ id: "push", term: "Push", topic: "maths" as GlossaryTerm["topic"] })])).toEqual(['Push: unknown topic "maths"']);
  });

  it("rejects long definitions and middle dots", () => {
    expect(glossaryErrors([term({ definition: "x".repeat(400), id: "push", term: "Push" })])).toEqual(["Push: definition is longer than 320 characters"]);
    expect(glossaryErrors([term({ example: "Push · fold", id: "push", term: "Push" })])).toEqual(["Push: middle dot in the text"]);
  });
});

/** Every name the spec's Glossary section lists, plus every term and abbreviation the other tools show. */
const REQUIRED = [
  // Spec: tool concepts.
  "Equity",
  "Pot odds",
  "Required equity",
  "SPR",
  "EV",
  "Exploitability",
  // Spec: actions.
  "Open",
  "Limp",
  "Iso-raise",
  "3-bet",
  "Push",
  "Call",
  "Fold",
  "Check",
  "Bet",
  "All-in",
  // Spec: table terms.
  "Position",
  "Blinds",
  "Blind level",
  "Stack depth",
  "Stack tier",
  "Effective stack",
  // Spec: ranges and Charts.
  "Hand class",
  "Combo",
  "Suited",
  "Offsuit",
  "Range",
  "Range string",
  "Range notation",
  "Action frequency",
  "Chart",
  "Situation",
  // Spec: Player types.
  "Player type",
  "Tight",
  "Standard",
  "Loose",
  // Spec: solver terms.
  "GTO",
  "Nash equilibrium",
  "CFR",
  "Spot",
  "Preflop line",
  "Game tree",
  // Spec: abbreviations.
  "bb",
  "OOP",
  "IP",
  "ICM",
  // Shown in the tools.
  "UTG",
  "UTG+1",
  "LJ",
  "HJ",
  "CO",
  "BTN",
  "SB",
  "BB",
  "Early position",
  "Middle position",
  "Late position",
  "Raise",
  "Overlimp",
  "Walk",
  "Vs open",
  "Vs limpers",
  "Vs push",
  "Push/fold chart",
  "Baseline",
  "Equity needed",
  "Win",
  "Tie",
  "Monte Carlo",
  "Exact",
  "Runout",
  "Heuristic",
  "Preflop",
  "Postflop",
  "Flop",
  "Turn",
  "River",
  "Street",
  "Board",
  "Dead cards",
  "Showdown",
  "Any two cards",
  "Heads-up",
  "Short-handed",
  "Blind structure",
  "Chips",
  "Pot",
  "Ante",
  "Chip EV",
  "Iteration",
  "Strategy",
  "Bet size",
  "13×13 grid",
  "Pair",
];

const normalise = (text: string) => text.toLowerCase().replace(/[^a-z0-9×]/g, "");

describe("the repo glossary", () => {
  it("is valid", () => {
    expect(glossaryErrors(GLOSSARY)).toEqual([]);
  });

  it("only uses known topics, and every topic has terms", () => {
    for (const entry of GLOSSARY) expect(GLOSSARY_TOPICS).toContain(entry.topic);
    expect(groupByTopic(GLOSSARY).map((group) => group.topic)).toEqual([...GLOSSARY_TOPICS]);
  });

  it.each(REQUIRED)("has an entry named %s", (name) => {
    const named = GLOSSARY.filter((entry) => termNames(entry).some((other) => normalise(other) === normalise(name)));
    expect(named.length, `${name} names ${named.length} entries`).toBeGreaterThanOrEqual(1);
    expect(filterTerms(GLOSSARY, name).map((entry) => entry.id)).toEqual(expect.arrayContaining(named.map((entry) => entry.id)));
  });

  it("keeps the anchors other tools link to", () => {
    for (const id of ["equity", "pot-odds", "required-equity", "spr", "ev", "exploitability", "stack-tier", "player-type", "spot", "preflop-line", "push-fold-chart"]) {
      expect(GLOSSARY.map((entry) => entry.id)).toContain(id);
    }
  });
});

describe("translateGlossary", () => {
  const french = translateGlossary(SAMPLE, { push: { aliases: ["Tapis"], definition: "Partir à tapis : simple.", example: "10 000 jetons", term: "Push" } });

  it("keeps the anchor and topic, and leaves untranslated terms alone", () => {
    expect(french[0]).toMatchObject({ id: "push", term: "Push", topic: "actions" });
    expect(french[1]).toBe(SAMPLE[1]);
  });

  it("keeps the English names searchable", () => {
    expect(ids(filterTerms(french, "tapis"))).toEqual(["push"]);
    expect(ids(filterTerms(french, "shove"))).toEqual(["push"]);
  });

  it("applies French typography", () => {
    expect(french[0].definition).toBe("Partir à tapis\u00a0: simple.");
    expect(french[0].example).toBe("10\u202f000 jetons");
    expect(frenchTypography("Prêt ? 82 % « oui » ; non")).toBe("Prêt\u202f? 82\u00a0% «\u00a0oui\u00a0»\u202f; non");
  });
});

describe("the French glossary", () => {
  const french = glossaryTerms("fr");
  const englishIds = GLOSSARY.map((entry) => entry.id);

  it("translates every term, and only those", () => {
    expect(Object.keys(GLOSSARY_FR).sort()).toEqual([...englishIds].sort());
  });

  it("is valid", () => {
    expect(glossaryErrors(french)).toEqual([]);
    expect(french.map((entry) => entry.id)).toEqual(englishIds);
  });

  it.each([
    "Équité",
    "Cote du pot",
    "Équité requise",
    "Relancer",
    "Se coucher",
    "Tapis",
    "Isoler",
    "Profil de joueur",
    "Serré",
    "Large",
    "Ligne préflop",
    "Cartes mortes",
    "Niveau de blindes",
    "Tranche de stack",
    "Face à un open",
    "Face aux limpers",
    "Face à un push",
  ])("finds %s", (name) => {
    expect(filterTerms(french, name).length).toBeGreaterThanOrEqual(1);
  });

  it("still finds the English names", () => {
    for (const name of REQUIRED) expect(filterTerms(french, name).length, name).toBeGreaterThanOrEqual(1);
  });

  it("finds the action names the French tools show", () => {
    for (const label of Object.values(messages("fr").actions)) expect(filterTerms(french, label).length, label).toBeGreaterThanOrEqual(1);
  });
});

describe("filtering across languages", () => {
  const english = glossaryTerms("en");
  const french = glossaryTerms("fr");

  it("finds a French query on the English page, so the filter survives a language switch", () => {
    expect(ids(filterTerms(english, "relance"))).toEqual(ids(filterTerms(french, "relance")));
    expect(ids(filterTerms(english, "relance"))).toContain("raise");
    expect(ids(filterTerms(english, "Cote du pot"))).toContain("pot-odds");
  });

  it("finds every French name, abbreviation and alias on the English page", () => {
    for (const [id, translation] of Object.entries(GLOSSARY_FR)) {
      for (const name of [translation.term, translation.abbreviation, ...(translation.aliases ?? [])].filter((value) => value !== undefined)) {
        expect(ids(filterTerms(english, name)), name).toContain(id);
      }
    }
  });

  it("finds every English name on the French page", () => {
    for (const entry of GLOSSARY) for (const name of termNames(entry)) expect(ids(filterTerms(french, name)), name).toContain(entry.id);
  });

  it("shows the English text on the English page", () => {
    expect(english.map(({ id, term, definition }) => ({ definition, id, term }))).toEqual(GLOSSARY.map(({ id, term, definition }) => ({ definition, id, term })));
  });
});
